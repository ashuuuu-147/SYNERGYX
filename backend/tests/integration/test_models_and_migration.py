"""Integration tests for SQLAlchemy domain models and Alembic migrations."""

import contextlib
import os
from datetime import date
from decimal import Decimal

import pytest
from alembic.config import Config
from alembic.util import CommandError
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.models import (
    Organization,
    ProductionRecord,
    User,
    UtilityRecord,
)


@pytest.fixture(scope="module")
def migrated_db():
    """Create a temporary SQLite database, apply Alembic migrations, and yield its connection."""
    db_file = "test_alembic_integration.db"
    db_url = f"sqlite:///{db_file}"

    if os.path.exists(db_file):
        with contextlib.suppress(OSError):
            os.remove(db_file)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(alembic_cfg, "head")

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    yield TestingSession

    # Downgrade and clean up
    with contextlib.suppress(CommandError, OSError):
        command.downgrade(alembic_cfg, "base")

    engine.dispose()

    if os.path.exists(db_file):
        with contextlib.suppress(OSError):
            os.remove(db_file)


def test_migration_and_decimal_roundtrip(migrated_db):
    """Test inserting models with Decimal quantities and retrieving exact values."""
    db: Session = migrated_db()

    # 1. Create Organization
    org = Organization(
        name="Test Textile Factory",
        industry="textile",
        location="Surat, India",
        country_code="IN",
        production_unit="kg",
        allow_external_ai=False,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # 2. Create User
    user = User(
        organization_id=org.id,
        full_name="Rajesh Patel",
        email="rajesh@testtextiles.com",
        password_hash="argon2_hashed_secret",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Create Utility Record with exact Decimals
    record = UtilityRecord(
        organization_id=org.id,
        resource_type="electricity",
        period_month=date(2026, 3, 1),
        quantity=Decimal("10500.250"),
        unit="kWh",
        amount_inr=Decimal("84000.75"),
        created_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    assert record.quantity == Decimal("10500.250")
    assert record.amount_inr == Decimal("84000.75")

    # 4. Create Production Record
    prod = ProductionRecord(
        organization_id=org.id,
        period_month=date(2026, 3, 1),
        quantity=Decimal("10000.000"),
        unit="kg",
        created_by=user.id,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    assert prod.quantity == Decimal("10000.000")

    db.close()


def test_unique_constraint_utility_record(migrated_db):
    """Ensure duplicate (organization, resource, month) is rejected."""
    db: Session = migrated_db()

    org = Organization(
        name="Unique Test Org",
        industry="packaging",
        location="Pune, India",
        production_unit="tonne",
    )
    db.add(org)
    db.commit()

    record1 = UtilityRecord(
        organization_id=org.id,
        resource_type="water",
        period_month=date(2026, 1, 1),
        quantity=Decimal("50.000"),
        unit="m3",
    )
    db.add(record1)
    db.commit()

    # Second record with same org, resource_type, month
    record2 = UtilityRecord(
        organization_id=org.id,
        resource_type="water",
        period_month=date(2026, 1, 1),
        quantity=Decimal("60.000"),
        unit="m3",
    )
    db.add(record2)

    with pytest.raises(IntegrityError):
        db.commit()

    db.rollback()
    db.close()


def test_unique_constraint_production_record(migrated_db):
    """Ensure duplicate (organization, month) in production is rejected."""
    db: Session = migrated_db()

    org = Organization(
        name="Unique Prod Org",
        industry="metal_fabrication",
        location="Chennai, India",
        production_unit="piece",
    )
    db.add(org)
    db.commit()

    p1 = ProductionRecord(
        organization_id=org.id,
        period_month=date(2026, 2, 1),
        quantity=Decimal("1500.000"),
        unit="piece",
    )
    db.add(p1)
    db.commit()

    p2 = ProductionRecord(
        organization_id=org.id,
        period_month=date(2026, 2, 1),
        quantity=Decimal("2000.000"),
        unit="piece",
    )
    db.add(p2)

    with pytest.raises(IntegrityError):
        db.commit()

    db.rollback()
    db.close()
