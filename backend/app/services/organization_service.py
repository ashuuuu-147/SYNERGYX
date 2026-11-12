"""Organization profile and settings service."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.schemas.organization import OrganizationAiConsentUpdate, OrganizationResponse, OrganizationUpdate


class OrganizationService:
    @staticmethod
    def get_organization(db: Session, organization_id: uuid.UUID) -> OrganizationResponse:
        """Fetch organization by ID, scoped to authenticated session."""
        org = db.scalar(select(Organization).where(Organization.id == organization_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")
        return OrganizationResponse.model_validate(org)

    @staticmethod
    def update_organization(
        db: Session,
        organization_id: uuid.UUID,
        update_data: OrganizationUpdate,
    ) -> OrganizationResponse:
        """Update organization profile with production unit modification safeguard."""
        org = db.scalar(select(Organization).where(Organization.id == organization_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        # Blueprint Section 5.11: Lock production unit once production records exist
        if update_data.production_unit and update_data.production_unit != org.production_unit:
            has_production_data = db.scalar(
                select(ProductionRecord.id).where(ProductionRecord.organization_id == organization_id).limit(1)
            )
            if has_production_data:
                raise BadRequestError(
                    "Production unit cannot be changed because production records already exist. Contact support for historical unit migration.",
                    code="PRODUCTION_UNIT_LOCKED",
                )
            org.production_unit = update_data.production_unit

        if update_data.name is not None:
            org.name = update_data.name.strip()
        if update_data.industry is not None:
            org.industry = update_data.industry
        if update_data.location is not None:
            org.location = update_data.location.strip()
        if update_data.country_code is not None:
            org.country_code = update_data.country_code.strip().upper()

        db.commit()
        db.refresh(org)
        return OrganizationResponse.model_validate(org)

    @staticmethod
    def update_ai_consent(
        db: Session,
        organization_id: uuid.UUID,
        consent_data: OrganizationAiConsentUpdate,
    ) -> OrganizationResponse:
        """Update external AI explanation consent toggle."""
        org = db.scalar(select(Organization).where(Organization.id == organization_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        org.allow_external_ai = consent_data.allow_external_ai
        db.commit()
        db.refresh(org)
        return OrganizationResponse.model_validate(org)
