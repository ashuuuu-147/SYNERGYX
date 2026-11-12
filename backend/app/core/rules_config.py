"""Rules configuration and threshold definitions for SYNERGYX deterministic insight engine.

Per Blueprint Section 10.2:
Rules are initial heuristics, not scientific diagnosis.
Thresholds are centralized here so they can be tuned.
"""

from decimal import Decimal

ENGINE_VERSION = "rules_v1.0"

# Percentage change thresholds vs immediately preceding calendar month
# 10% is a prototype heuristic, not a certified industry benchmark
ELECTRICITY_INTENSITY_UP_THRESHOLD = Decimal("10.0")
WATER_INTENSITY_UP_THRESHOLD = Decimal("10.0")
FUEL_INTENSITY_UP_THRESHOLD = Decimal("10.0")

# 5% or more decrease in intensity is recognized as an observed reduction
ELECTRICITY_INTENSITY_DOWN_THRESHOLD = Decimal("-5.0")

# High severity threshold
HIGH_SEVERITY_INTENSITY_THRESHOLD = Decimal("25.0")

CAVEAT_HEURISTIC = (
    "Thresholds are configurable prototype heuristics, not certified industry benchmarks. "
    "Verify operational factors such as equipment runtime, shift changes, or batch mix."
)
CAVEAT_OBSERVED_IMPROVEMENT = (
    "Observed improvement vs previous month. Does not prove a specific causal action "
    "without sub-metered equipment verification."
)
CAVEAT_MISSING_PRODUCTION = (
    "Production-normalized intensity requires confirmed monthly production output."
)
CAVEAT_MISSING_COST = (
    "Total utility spend will remain partial until invoice amounts are entered."
)
CAVEAT_DATA_READINESS = (
    "At least two consecutive comparable months are required for month-over-month trend curves."
)

