"""Unit tests for the Deterministic Calculation Engine.

Validates against mandatory test dataset and expected values in Section 16 of SYNERGYX MVP Blueprint.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.services.calculations import (
    MonthInputData,
    ResourceData,
    calculate_change_percent,
    calculate_observed_reduction,
    calculate_potential_saving,
    compute_month_analytics,
)


class TestSection16MandatoryDataset:
    """Verifies all mandatory test values and formulas from Blueprint Section 16."""

    @pytest.fixture
    def section_16_data(self):
        # January
        jan_data = MonthInputData(
            period_month=date(2026, 1, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("10000"), "kWh", Decimal("80000")),
                "water": ResourceData("water", Decimal("50"), "m3", Decimal("2000")),
                "fuel": ResourceData("fuel", Decimal("400"), "L", Decimal("40000")),
            },
            production_quantity=Decimal("10000"),
            production_unit="kg",
        )

        # February
        feb_data = MonthInputData(
            period_month=date(2026, 2, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("12000"), "kWh", Decimal("96000")),
                "water": ResourceData("water", Decimal("60"), "m3", Decimal("2400")),
                "fuel": ResourceData("fuel", Decimal("440"), "L", Decimal("44000")),
            },
            production_quantity=Decimal("10000"),
            production_unit="kg",
        )

        # March
        mar_data = MonthInputData(
            period_month=date(2026, 3, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("10500"), "kWh", Decimal("84000")),
                "water": ResourceData("water", Decimal("55"), "m3", Decimal("2200")),
                "fuel": ResourceData("fuel", Decimal("420"), "L", Decimal("42000")),
            },
            production_quantity=Decimal("10000"),
            production_unit="kg",
        )

        return {"jan": jan_data, "feb": feb_data, "mar": mar_data}

    def test_march_expected_analytics(self, section_16_data) -> None:
        feb = section_16_data["feb"]
        mar = section_16_data["mar"]

        result = compute_month_analytics(current=mar, previous=feb)

        # 1. Electricity intensity: 10,500 / 10,000 = 1.05 kWh/kg
        elec = result.resources["electricity"]
        assert elec.intensity == Decimal("1.05")
        assert elec.intensity_unit == "kWh/kg"

        # 2. February electricity intensity: 1.20 kWh/kg
        assert elec.prev_intensity == Decimal("1.2")

        # 3. Electricity intensity change vs February: -12.5%
        assert elec.intensity_change_pct == Decimal("-12.5")

        # 4. Observed electricity reduction vs February at March production: 1,500 kWh
        assert elec.observed_reduction_per_unit == Decimal("0.15")
        assert elec.observed_resource_reduction == Decimal("1500")

        # 5. Potential monetary saving in INR: 1,500 * (96,000 / 12,000) = ₹12,000
        assert elec.potential_saving_inr == Decimal("12000")

        # 6. Water intensity: 55 / 10,000 = 0.0055 m3/kg
        water = result.resources["water"]
        assert water.intensity == Decimal("0.0055")
        assert water.intensity_unit == "m3/kg"

        # 7. Fuel intensity: 420 / 10,000 = 0.042 L/kg
        fuel = result.resources["fuel"]
        assert fuel.intensity == Decimal("0.042")
        assert fuel.intensity_unit == "L/kg"

        # 8. March utility spend: ₹128,200 (84,000 + 2,200 + 42,000)
        assert result.total_spend_inr == Decimal("128200")

        # 9. Cost coverage: 3 of 3 utility types
        assert result.cost_data_coverage == "3 of 3 utility types"
        assert result.is_partial_cost is False


class TestCalculationEdgeCases:
    """Verifies missing data invariants specified in Section 9.8 and Section 16."""

    def test_no_production_in_month_yields_null_intensity(self) -> None:
        month_data = MonthInputData(
            period_month=date(2026, 3, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("10500"), "kWh", Decimal("84000")),
            },
            production_quantity=None,  # No production entered
            production_unit="kg",
        )
        result = compute_month_analytics(current=month_data, previous=None)
        assert result.resources["electricity"].intensity is None
        assert result.resources["electricity"].intensity_unit is None

    def test_missing_previous_month_yields_null_comparison(self) -> None:
        month_data = MonthInputData(
            period_month=date(2026, 3, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("10500"), "kWh", Decimal("84000")),
            },
            production_quantity=Decimal("10000"),
            production_unit="kg",
        )
        # Previous is None
        result = compute_month_analytics(current=month_data, previous=None)
        elec = result.resources["electricity"]
        assert elec.intensity == Decimal("1.05")
        assert elec.prev_intensity is None
        assert elec.intensity_change_pct is None
        assert elec.observed_resource_reduction is None
        assert elec.potential_saving_inr is None

    def test_partial_cost_coverage_reported_transparently(self) -> None:
        month_data = MonthInputData(
            period_month=date(2026, 3, 1),
            resources={
                "electricity": ResourceData("electricity", Decimal("10500"), "kWh", Decimal("84000")),
                "water": ResourceData("water", Decimal("55"), "m3", None),  # Missing amount
                "fuel": ResourceData("fuel", Decimal("420"), "L", Decimal("42000")),
            },
            production_quantity=Decimal("10000"),
            production_unit="kg",
        )
        result = compute_month_analytics(current=month_data, previous=None)
        assert result.total_spend_inr == Decimal("126000")  # 84000 + 42000
        assert result.cost_with_amount_count == 2
        assert result.total_resource_count == 3
        assert result.cost_data_coverage == "2 of 3 utility types"
        assert result.is_partial_cost is True

    def test_zero_baseline_returns_none_percentage_change(self) -> None:
        # Prev value is zero
        assert calculate_change_percent(Decimal("100"), Decimal("0")) is None
        assert calculate_change_percent(Decimal("100"), None) is None

    def test_negative_or_zero_reduction_yields_no_potential_savings(self) -> None:
        # Intensity rose from 1.0 to 1.2 (reduction is negative: -0.2)
        reduction_per_unit, total_reduction = calculate_observed_reduction(
            current_intensity=Decimal("1.2"),
            previous_intensity=Decimal("1.0"),
            current_production=Decimal("10000"),
        )
        assert reduction_per_unit == Decimal("-0.2")
        assert total_reduction == Decimal("-2000")

        # Potential saving is None when reduction is negative
        assert (
            calculate_potential_saving(
                observed_resource_reduction=total_reduction,
                previous_amount_inr=Decimal("80000"),
                previous_resource_quantity=Decimal("10000"),
            )
            is None
        )
