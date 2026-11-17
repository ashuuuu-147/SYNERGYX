"""Integration test for bulk CSV records import."""

import io
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app
from app.models.production_record import ProductionRecord
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService

SAMPLE_CSV = """Month,Electricity (kWh),Electricity Bill (?),Water (L),Water Bill (?),Fuel (L),Fuel Bill (?),Production
January,"4,820","43,380","38,500","1,925",620,"58,900","12,400"
February,"4,560","41,040","36,200","1,810",590,"56,050","11,850"
March,"5,190","46,710","41,000","2,050",675,"64,125","13,200"
April,"5,480","49,320","43,800","2,190",710,"67,450","13,950"
May,"5,310","47,790","42,100","2,105",690,"65,550","13,600"
"""


@pytest.fixture
def csv_test_env(tmp_path: Path):
    db_file = tmp_path / "test_csv_import.db"
    db_url = f"sqlite:///{db_file}"

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    backend_dir = Path(__file__).parent.parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(alembic_cfg, "head")

    def override_get_db():
        session = testing_session_local()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "engine": engine,
        "session_factory": testing_session_local,
    }

    app.dependency_overrides.clear()
    engine.dispose()


def test_import_records_csv(csv_test_env):
    """Verify uploading the user's 5-month CSV creates all utility and production records."""
    session_factory = csv_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Textile Corp",
                industry="textile",
                production_unit="kg",
                full_name="Rajesh Patel",
                email="rajesh.csv@textile.com",
                password="SecurePassword123!",
                location="Ahmedabad",
                country_code="IN",
            ),
        )
        token = reg.access_token

    auth_headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("energy_bills.csv", io.BytesIO(SAMPLE_CSV.encode("utf-8")), "text/csv"),
    }
    data = {"year": "2026"}

    response = client.post(
        "/api/v1/records/import-csv",
        files=files,
        data=data,
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["success"] is True
    assert result["utility_records_created"] == 15  # 5 months * 3 resource types
    assert result["production_records_created"] == 5  # 5 months
    assert len(result["months_processed"]) == 5

    with session_factory() as db:
        # Verify January records in database
        # 1. Electricity
        elec = db.scalar(
            select(UtilityRecord).where(
                UtilityRecord.resource_type == "electricity",
                UtilityRecord.period_month == date(2026, 1, 1),
            )
        )
        assert elec is not None
        assert elec.quantity == Decimal("4820.000")
        assert elec.unit == "kWh"
        assert elec.amount_inr == Decimal("43380.00")

        # 2. Water (canonical conversion 38,500 L -> 38.5 m3)
        water = db.scalar(
            select(UtilityRecord).where(
                UtilityRecord.resource_type == "water",
                UtilityRecord.period_month == date(2026, 1, 1),
            )
        )
        assert water is not None
        assert water.quantity == Decimal("38.500")
        assert water.unit == "m3"
        assert water.amount_inr == Decimal("1925.00")

        # 3. Fuel
        fuel = db.scalar(
            select(UtilityRecord).where(
                UtilityRecord.resource_type == "fuel",
                UtilityRecord.period_month == date(2026, 1, 1),
            )
        )
        assert fuel is not None
        assert fuel.quantity == Decimal("620.000")
        assert fuel.unit == "L"
        assert fuel.amount_inr == Decimal("58900.00")

        # 4. Production
        prod = db.scalar(
            select(ProductionRecord).where(
                ProductionRecord.period_month == date(2026, 1, 1),
            )
        )
        assert prod is not None
        assert prod.quantity == Decimal("12400.000")
        assert prod.unit == "kg"

    # Re-uploading same CSV should update (upsert) without error
    files_again = {
        "file": ("energy_bills.csv", io.BytesIO(SAMPLE_CSV.encode("utf-8")), "text/csv"),
    }
    response_again = client.post(
        "/api/v1/records/import-csv",
        files=files_again,
        data=data,
        headers=auth_headers,
    )
    assert response_again.status_code == 200
    res2 = response_again.json()
    assert res2["utility_records_updated"] == 15
    assert res2["production_records_updated"] == 5
    assert res2["utility_records_created"] == 0
