"""Service layer for parsing and importing bulk utility and production CSV records."""

import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.csv_import import CsvImportDetail, CsvImportResponse

MONTH_MAP = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}


def parse_month_cell(val: str, default_year: int) -> date:
    """Parse flexible month representations (e.g. 'January', '2026-01', 'Jan 2026', '01/2026')."""
    clean_val = val.strip().lower()
    if not clean_val:
        raise BadRequestError("Empty month cell in CSV.", code="INVALID_CSV_ROW")

    # Check for YYYY-MM or YYYY/MM
    ym_match = re.search(r"(\d{4})[-/.](\d{1,2})", clean_val)
    if ym_match:
        year = int(ym_match.group(1))
        month = int(ym_match.group(2))
        if 1 <= month <= 12:
            return date(year, month, 1)

    # Check for MM/YYYY or MM-YYYY
    my_match = re.search(r"(\d{1,2})[-/.](\d{4})", clean_val)
    if my_match:
        month = int(my_match.group(1))
        year = int(my_match.group(2))
        if 1 <= month <= 12:
            return date(year, month, 1)

    # Check if a 4-digit year is present somewhere in the string
    extracted_year = default_year
    year_match = re.search(r"\b(20\d\d|19\d\d)\b", clean_val)
    if year_match:
        extracted_year = int(year_match.group(1))

    # Match month name or abbreviation
    for name, month_num in MONTH_MAP.items():
        if re.search(rf"\b{name}\b", clean_val):
            return date(extracted_year, month_num, 1)

    raise BadRequestError(
        f"Unable to parse month from '{val}'. Expected month name (e.g. 'January') or 'YYYY-MM'.",
        code="INVALID_CSV_MONTH",
    )


def clean_decimal(val: str | None) -> Decimal | None:
    """Clean currency, commas, quotes, and whitespace into a Decimal."""
    if val is None:
        return None
    raw = str(val).strip()
    if not raw or raw in ("-", "—", "N/A", "null", "None"):
        return None

    # Remove commas, currency symbols (₹, $, ?, etc.), and whitespace
    cleaned = re.sub(r"[^\d.-]", "", raw)
    if not cleaned or cleaned in ("-", "."):
        return None

    try:
        dec = Decimal(cleaned)
        return dec
    except InvalidOperation:
        return None


class CsvImportService:
    """Bulk import service for monthly resource intelligence records."""

    @staticmethod
    def import_records_csv(
        db: Session,
        current_user: User,
        csv_content: str,
        default_year: int | None = None,
    ) -> CsvImportResponse:
        """Parse CSV rows and upsert utility and production records."""
        org = db.scalar(select(Organization).where(Organization.id == current_user.organization_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        target_year = default_year or date.today().year

        reader = csv.reader(io.StringIO(csv_content.strip()))
        rows = list(reader)
        if not rows:
            raise BadRequestError("Uploaded CSV file is empty.", code="EMPTY_CSV")

        headers = [h.strip().lower() for h in rows[0]]

        # Identify column indices based on flexible name matching
        col_month = -1
        col_elec_qty = -1
        col_elec_bill = -1
        col_water_qty = -1
        col_water_bill = -1
        col_fuel_qty = -1
        col_fuel_bill = -1
        col_prod_qty = -1

        water_is_liters = True  # Default assumption unless header says m3

        for idx, h in enumerate(headers):
            # Clean header for robust matching
            norm = re.sub(r"[^\w\s]", " ", h).strip()

            if any(k in norm for k in ("month", "period", "date", "billing")):
                col_month = idx
            elif "elec" in norm or "power" in norm:
                if any(b in norm for b in ("bill", "cost", "amount", "inr", "rs")):
                    col_elec_bill = idx
                else:
                    col_elec_qty = idx
            elif "water" in norm:
                if any(b in norm for b in ("bill", "cost", "amount", "inr", "rs")):
                    col_water_bill = idx
                else:
                    col_water_qty = idx
                    if "m3" in h.lower() or "m³" in h.lower() or "cubic" in h.lower():
                        water_is_liters = False
            elif "fuel" in norm or "diesel" in norm:
                if any(b in norm for b in ("bill", "cost", "amount", "inr", "rs")):
                    col_fuel_bill = idx
                else:
                    col_fuel_qty = idx
            elif any(p in norm for p in ("production", "output", "units produced")):
                col_prod_qty = idx

        if col_month == -1:
            raise BadRequestError(
                "CSV must contain a 'Month' column (e.g. Month, Period, Date).",
                code="MISSING_MONTH_COLUMN",
            )

        if col_elec_qty == -1 and col_water_qty == -1 and col_fuel_qty == -1 and col_prod_qty == -1:
            raise BadRequestError(
                "CSV must contain at least one recognized utility or production column.",
                code="NO_RECOGNIZED_COLUMNS",
            )

        months_processed: list[str] = []
        utility_created = 0
        utility_updated = 0
        production_created = 0
        production_updated = 0
        details: list[CsvImportDetail] = []

        try:
            for row_idx, row in enumerate(rows[1:], start=2):
                if not row or not any(cell.strip() for cell in row):
                    continue  # skip blank lines

                month_val = row[col_month] if col_month < len(row) else ""
                if not month_val.strip():
                    continue

                period_month = parse_month_cell(month_val, target_year)
                month_str = period_month.strftime("%Y-%m")
                months_processed.append(month_str)

                # 1. Electricity Record
                elec_qty = clean_decimal(row[col_elec_qty]) if col_elec_qty != -1 and col_elec_qty < len(row) else None
                elec_bill = (
                    clean_decimal(row[col_elec_bill]) if col_elec_bill != -1 and col_elec_bill < len(row) else None
                )

                if elec_qty is not None and elec_qty > Decimal(0):
                    existing_elec = db.scalar(
                        select(UtilityRecord).where(
                            UtilityRecord.organization_id == current_user.organization_id,
                            UtilityRecord.resource_type == "electricity",
                            UtilityRecord.period_month == period_month,
                        )
                    )
                    if existing_elec:
                        existing_elec.quantity = elec_qty
                        existing_elec.amount_inr = elec_bill
                        existing_elec.unit = "kWh"
                        utility_updated += 1
                    else:
                        db.add(
                            UtilityRecord(
                                organization_id=current_user.organization_id,
                                resource_type="electricity",
                                period_month=period_month,
                                quantity=elec_qty,
                                unit="kWh",
                                amount_inr=elec_bill,
                                notes="Bulk imported from CSV",
                                created_by=current_user.id,
                            )
                        )
                        utility_created += 1

                # 2. Water Record
                water_qty_raw = (
                    clean_decimal(row[col_water_qty]) if col_water_qty != -1 and col_water_qty < len(row) else None
                )
                water_bill = (
                    clean_decimal(row[col_water_bill]) if col_water_bill != -1 and col_water_bill < len(row) else None
                )

                if water_qty_raw is not None and water_qty_raw > Decimal(0):
                    # Convert to canonical m3 if input is in Liters
                    canonical_water = water_qty_raw / Decimal(1000) if water_is_liters else water_qty_raw
                    canonical_water = round(canonical_water, 3)

                    existing_water = db.scalar(
                        select(UtilityRecord).where(
                            UtilityRecord.organization_id == current_user.organization_id,
                            UtilityRecord.resource_type == "water",
                            UtilityRecord.period_month == period_month,
                        )
                    )
                    if existing_water:
                        existing_water.quantity = canonical_water
                        existing_water.amount_inr = water_bill
                        existing_water.unit = "m3"
                        utility_updated += 1
                    else:
                        db.add(
                            UtilityRecord(
                                organization_id=current_user.organization_id,
                                resource_type="water",
                                period_month=period_month,
                                quantity=canonical_water,
                                unit="m3",
                                amount_inr=water_bill,
                                notes="Bulk imported from CSV",
                                created_by=current_user.id,
                            )
                        )
                        utility_created += 1

                # 3. Fuel Record
                fuel_qty = clean_decimal(row[col_fuel_qty]) if col_fuel_qty != -1 and col_fuel_qty < len(row) else None
                fuel_bill = (
                    clean_decimal(row[col_fuel_bill]) if col_fuel_bill != -1 and col_fuel_bill < len(row) else None
                )

                if fuel_qty is not None and fuel_qty > Decimal(0):
                    existing_fuel = db.scalar(
                        select(UtilityRecord).where(
                            UtilityRecord.organization_id == current_user.organization_id,
                            UtilityRecord.resource_type == "fuel",
                            UtilityRecord.period_month == period_month,
                        )
                    )
                    if existing_fuel:
                        existing_fuel.quantity = fuel_qty
                        existing_fuel.amount_inr = fuel_bill
                        existing_fuel.unit = "L"
                        utility_updated += 1
                    else:
                        db.add(
                            UtilityRecord(
                                organization_id=current_user.organization_id,
                                resource_type="fuel",
                                period_month=period_month,
                                quantity=fuel_qty,
                                unit="L",
                                amount_inr=fuel_bill,
                                notes="Bulk imported from CSV",
                                created_by=current_user.id,
                            )
                        )
                        utility_created += 1

                # 4. Production Record
                prod_qty = clean_decimal(row[col_prod_qty]) if col_prod_qty != -1 and col_prod_qty < len(row) else None
                if prod_qty is not None and prod_qty > Decimal(0):
                    existing_prod = db.scalar(
                        select(ProductionRecord).where(
                            ProductionRecord.organization_id == current_user.organization_id,
                            ProductionRecord.period_month == period_month,
                        )
                    )
                    if existing_prod:
                        existing_prod.quantity = prod_qty
                        existing_prod.unit = org.production_unit
                        production_updated += 1
                    else:
                        db.add(
                            ProductionRecord(
                                organization_id=current_user.organization_id,
                                period_month=period_month,
                                quantity=prod_qty,
                                unit=org.production_unit,
                                notes="Bulk imported from CSV",
                                created_by=current_user.id,
                            )
                        )
                        production_created += 1

                details.append(
                    CsvImportDetail(
                        month=month_str,
                        electricity_kwh=str(elec_qty) if elec_qty is not None else None,
                        electricity_bill_inr=str(elec_bill) if elec_bill is not None else None,
                        water_m3=(
                            str(round(water_qty_raw / Decimal(1000) if water_is_liters else water_qty_raw, 3))
                            if water_qty_raw is not None
                            else None
                        ),
                        water_bill_inr=str(water_bill) if water_bill is not None else None,
                        fuel_l=str(fuel_qty) if fuel_qty is not None else None,
                        fuel_bill_inr=str(fuel_bill) if fuel_bill is not None else None,
                        production=str(prod_qty) if prod_qty is not None else None,
                    )
                )

            db.commit()

        except Exception as e:
            db.rollback()
            if isinstance(e, BadRequestError):
                raise
            raise BadRequestError(f"Failed to import CSV: {str(e)}", code="CSV_IMPORT_FAILED") from e

        return CsvImportResponse(
            success=True,
            message=f"Successfully processed {len(months_processed)} months ({utility_created} utilities created, {utility_updated} updated, {production_created} production created, {production_updated} updated).",
            months_processed=months_processed,
            utility_records_created=utility_created,
            utility_records_updated=utility_updated,
            production_records_created=production_created,
            production_records_updated=production_updated,
            details=details,
        )
