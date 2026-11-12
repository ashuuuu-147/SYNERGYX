"""Integration tests for Optional AI Explanation Adapter, Consent Safeguards, and Fallback Engine."""

import contextlib
import os
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.ai_log import AiGenerationLog
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.utility_record import UtilityRecord
from app.schemas.ai import InsightExplanation, InsightFacts
from app.schemas.auth import RegisterRequest
from app.services.ai_provider import (
    AiProviderError,
    OpenAiExplanationProvider,
)
from app.services.auth_service import AuthService


@pytest.fixture
def ai_test_env(tmp_path: Path):
    db_file = tmp_path / "test_ai.db"
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
    with contextlib.suppress(OSError):
        if db_file.exists():
            os.remove(db_file)


def test_ai_facts_contain_zero_pii() -> None:
    """Verify that InsightFacts schema contains only aggregated, non-identifying fields."""
    facts = InsightFacts(
        industry="textile",
        period_month=date(2026, 3, 1),
        metric_code="electricity_intensity_up",
        resource_type="electricity",
        calculated_quantity=Decimal("12000"),
        canonical_unit="kWh",
        production_quantity=Decimal("10000"),
        production_unit="kg",
        calculated_intensity=Decimal("1.2"),
        comparison_value=Decimal("1.0"),
        change_percent=Decimal("20.0"),
    )

    dumped = facts.model_dump()
    forbidden_keys = {"company_name", "factory_name", "email", "name", "address", "phone", "invoice_number"}
    for k in forbidden_keys:
        assert k not in dumped

    # Extra keys are forbidden
    with pytest.raises(ValidationError):
        InsightFacts(
            industry="textile",
            period_month=date(2026, 3, 1),
            metric_code="electricity_intensity_up",
            company_name="Acme Mills",  # Extra key should fail
        )


def test_ai_consent_default_false_uses_rules_only(ai_test_env) -> None:
    session_factory = ai_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="privacy_owner@plant.com",
                password="SecurePassword123!",
                full_name="Vikram Patel",
                organization_name="Patel Yarn Mills",
                industry="textile",
                location="Ahmedabad",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Verify default consent is False
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        assert org.allow_external_ai is False

        # Add data
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 5, 1),
                quantity=Decimal("15000"),
                unit="kWh",
                amount_inr=Decimal("120000"),
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 5, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # Generate insights with consent=False
    with patch("app.services.ai_provider.OpenAiExplanationProvider.explain_insights") as mock_openai:
        res = client.post("/api/v1/insights/generate?month=2026-05", headers=headers)
        assert res.status_code == 200

        # OpenAI must NEVER be called when allow_external_ai is False
        mock_openai.assert_not_called()

        data = res.json()
        assert data["insights_generated_count"] >= 1
        for insight in data["insights"]:
            assert insight["source_type"] == "rules"

    # Verify audit log recorded rules provider
    with session_factory() as db:
        logs = list(
            db.scalars(
                select(AiGenerationLog).where(
                    AiGenerationLog.organization_id == org_id,
                    AiGenerationLog.period_month == date(2026, 5, 1),
                )
            ).all()
        )
        assert len(logs) >= 1
        assert logs[0].provider == "rules"
        assert logs[0].status == "success"


def test_ai_consent_enabled_with_successful_openai_response(ai_test_env) -> None:
    session_factory = ai_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="ai_opt_in@textile.com",
                password="SecurePassword123!",
                full_name="Deepak Joshi",
                organization_name="Joshi Fabrics",
                industry="textile",
                location="Surat",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Opt in to AI consent
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        org.allow_external_ai = True

        # Insert baseline (Apr) and current month (May with +20% electricity intensity)
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 4, 1),
                quantity=Decimal("10000"),
                unit="kWh",
                amount_inr=Decimal("80000"),
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 4, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 5, 1),
                quantity=Decimal("12000"),
                unit="kWh",
                amount_inr=Decimal("96000"),
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 5, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    mock_explanation = InsightExplanation(
        summary="AI Analysis: Electricity intensity increased by 20.0% due to base electrical loads.",
        possible_causes=["Compressed air leakage", "Extended idle machinery runtime"],
        next_steps=["Audit compressor line pressure", "Install auto-shutoff switches"],
        caveat="Verified against non-identifying operational metrics.",
    )

    with (
        patch.object(settings, "AI_PROVIDER", "openai"),
        patch.object(settings, "OPENAI_API_KEY", "mock-openai-key"),
        patch.object(OpenAiExplanationProvider, "explain_insights", return_value=mock_explanation) as mock_ai,
    ):
        res = client.post("/api/v1/insights/generate?month=2026-05", headers=headers)
        assert res.status_code == 200
        mock_ai.assert_called()

        data = res.json()
        elec_insight = next(i for i in data["insights"] if i["metric_code"] == "electricity_intensity_up")
        assert elec_insight["source_type"] == "ai_assisted"
        assert "AI Analysis" in elec_insight["summary"]
        # Numeric values remain strictly backend-calculated!
        assert float(elec_insight["observed_value"]) == 1.2
        assert float(elec_insight["change_percent"]) == 20.0

    # Verify audit log recorded success
    with session_factory() as db:
        logs = list(
            db.scalars(
                select(AiGenerationLog).where(
                    AiGenerationLog.organization_id == org_id,
                    AiGenerationLog.provider == "openai",
                )
            ).all()
        )
        assert any(log.status == "success" for log in logs)


def test_ai_fallback_on_provider_error_and_timeout(ai_test_env) -> None:
    session_factory = ai_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="timeout_test@factory.com",
                password="SecurePassword123!",
                full_name="Karan Shah",
                organization_name="Shah Packaging",
                industry="packaging",
                location="Vapi",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Opt in to AI
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        org.allow_external_ai = True

        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="fuel",
                period_month=date(2026, 6, 1),
                quantity=Decimal("600"),
                unit="L",
                amount_inr=Decimal("54000"),
            )
        )
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # Simulate OpenAI timeout
    with (
        patch.object(settings, "AI_PROVIDER", "openai"),
        patch.object(settings, "OPENAI_API_KEY", "mock-openai-key"),
        patch.object(
            OpenAiExplanationProvider,
            "explain_insights",
            side_effect=AiProviderError("Timeout", category="timeout"),
        ),
    ):
        res = client.post("/api/v1/insights/generate?month=2026-06", headers=headers)
        # Must return 200, NEVER crash with 500!
        assert res.status_code == 200
        data = res.json()
        assert data["insights_generated_count"] >= 1
        # Fallback ensures source_type is "rules"
        assert all(i["source_type"] == "rules" for i in data["insights"])

    # Verify audit log recorded fallback with error category 'timeout'
    with session_factory() as db:
        log = db.scalar(
            select(AiGenerationLog).where(
                AiGenerationLog.organization_id == org_id,
                AiGenerationLog.provider == "openai",
            )
        )
        assert log is not None
        assert log.status == "fallback"
        assert log.error_category == "timeout"
