"""Pydantic schemas for bulk CSV records import."""

from pydantic import BaseModel, ConfigDict


class CsvImportDetail(BaseModel):
    """Detailed summary of an imported monthly record row."""

    model_config = ConfigDict(from_attributes=True)

    month: str
    electricity_kwh: str | None = None
    electricity_bill_inr: str | None = None
    water_m3: str | None = None
    water_bill_inr: str | None = None
    fuel_l: str | None = None
    fuel_bill_inr: str | None = None
    production: str | None = None


class CsvImportResponse(BaseModel):
    """Response returned upon successful CSV records import."""

    model_config = ConfigDict(from_attributes=True)

    success: bool
    message: str
    months_processed: list[str]
    utility_records_created: int
    utility_records_updated: int
    production_records_created: int
    production_records_updated: int
    details: list[CsvImportDetail]
