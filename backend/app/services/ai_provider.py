"""AI explanation provider adapter and fallback engine.

Per Blueprint Section 10.4:
- Protocol-based provider interface
- Strict non-identifying facts only
- Pure Python deterministic rules fallback
- Timeout, error classification, and structured output validation for OpenAI
"""

import json
import logging
from typing import Protocol

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ai import InsightExplanation, InsightFacts

logger = logging.getLogger("synergyx.services.ai_provider")


class AiProviderError(Exception):
    """Classified exception raised by external AI provider adapters."""

    def __init__(self, message: str, category: str = "provider_error"):
        super().__init__(message)
        self.category = category


class ExplanationProvider(Protocol):
    """Protocol for insight explanation providers."""

    def explain_insights(self, facts: InsightFacts) -> InsightExplanation:
        """Generate structured explanation and recommendations from non-identifying facts."""
        ...


class RulesExplanationProvider:
    """Deterministic, pure-python fallback explanation provider."""

    def explain_insights(self, facts: InsightFacts) -> InsightExplanation:
        """Generate deterministic explanation based entirely on rule heuristics."""
        metric = facts.metric_code
        ind = facts.industry.replace("_", " ")

        if metric == "electricity_intensity_up":
            pct = f"{facts.change_percent:.1f}" if facts.change_percent is not None else "10+"
            return InsightExplanation(
                summary=(
                    f"In this {ind} facility, electricity consumption per unit of production rose by {pct}% "
                    f"compared to the prior month."
                ),
                possible_causes=[
                    "Extended machine idle time during non-operational periods, where applicable.",
                    "Lower factory throughput with constant base electrical loads.",
                    "Higher auxiliary load from compressed air or cooling systems, where applicable.",
                ],
                next_steps=[
                    "Audit equipment runtime and establish strict shutdown schedules.",
                    "Inspect compressor pipelines for air pressure leaks.",
                    "Review utility bills for power factor penalties or demand spikes.",
                ],
                caveat="Configurable prototype heuristic. Verify whether operational shifts or product mix varied.",
            )

        if metric == "water_intensity_up":
            pct = f"{facts.change_percent:.1f}" if facts.change_percent is not None else "10+"
            return InsightExplanation(
                summary=(
                    f"Water consumption per unit of production increased by {pct}% vs the previous month "
                    f"for this {ind} operation."
                ),
                possible_causes=[
                    "Unrecorded leaks or overflowing storage tanks, where applicable.",
                    "Changes in washing, rinsing, or boiler feedwater frequency.",
                    "Shift towards water-intensive product lines or batch sizes.",
                ],
                next_steps=[
                    "Inspect valves, pipelines, and storage tanks for visible leakage.",
                    "Review wash cycle durations and water meters across key process areas.",
                    "Record water usage before and after routine shift cleanups.",
                ],
                caveat="Heuristic threshold. Verify whether washing schedules or batch recipes changed.",
            )

        if metric == "fuel_intensity_up":
            pct = f"{facts.change_percent:.1f}" if facts.change_percent is not None else "10+"
            return InsightExplanation(
                summary=(
                    f"Fuel intensity per unit of production rose by {pct}% vs the previous month "
                    f"in this {ind} facility."
                ),
                possible_causes=[
                    "Increased diesel generator runtime during grid power interruptions, where applicable.",
                    "Boiler burner inefficiency or degraded insulation on steam piping.",
                    "Variations in burner fuel quality or thermal load requirements.",
                ],
                next_steps=[
                    "Cross-reference fuel purchases with backup generator logbooks.",
                    "Inspect steam traps and thermal insulation on distribution lines.",
                    "Service burner nozzles and check air-fuel ratios.",
                ],
                caveat="Heuristic threshold. Verify backup power runtime and boiler service records.",
            )

        if metric == "electricity_intensity_down":
            pct = f"{abs(facts.change_percent):.1f}" if facts.change_percent is not None else "5+"
            return InsightExplanation(
                summary=(
                    f"Observed an improvement in electricity intensity, dropping by {pct}% vs "
                    f"the previous month in this {ind} facility."
                ),
                possible_causes=[
                    "Higher production throughput distributing base electricity load over more units.",
                    "Recent operational efficiency measures or equipment optimization, where applicable.",
                    "Seasonal variation in cooling or lighting requirements.",
                ],
                next_steps=[
                    "Document operational conditions during this month to sustain efficiency.",
                    "Verify sub-meter readings to isolate which department achieved the reduction.",
                ],
                caveat="Observed improvement vs previous month; does not prove a single causal action.",
            )

        if metric == "missing_production_data":
            return InsightExplanation(
                summary=(
                    f"Utility records exist for {facts.period_month.strftime('%B %Y')}, but production quantity is missing."
                ),
                possible_causes=["Monthly production records have not yet been recorded in the system."],
                next_steps=[
                    "Navigate to Records > Production and enter the verified monthly volume.",
                    "Regenerate insights to view normalized intensity.",
                ],
                caveat="Production intensity requires non-zero confirmed monthly production volume.",
            )

        if metric == "missing_cost_data":
            return InsightExplanation(
                summary=(
                    f"One or more utility records for {facts.period_month.strftime('%B %Y')} are missing billing amounts."
                ),
                possible_causes=["Invoices were either received late or entered without monetary values."],
                next_steps=[
                    "Collect billing statements and update utility records with invoice amounts in INR."
                ],
                caveat="Expenditure analytics and potential savings calculations remain partial.",
            )

        # Default fallback
        return InsightExplanation(
            summary=f"Resource efficiency observation for {facts.metric_code} in {facts.period_month.strftime('%B %Y')}.",
            possible_causes=["Operational baseline evaluation."],
            next_steps=["Continue recording regular monthly utility and production figures."],
            caveat="Evaluation based on deterministic threshold rules.",
        )


class OpenAiExplanationProvider:
    """External LLM explanation provider using OpenAI structured outputs with strict timeout and fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: int | None = None,
    ):
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.timeout = timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS

    def explain_insights(self, facts: InsightFacts) -> InsightExplanation:
        """Send aggregated non-identifying facts to OpenAI and validate structured output."""
        if not self.api_key:
            raise AiProviderError("OpenAI API key not configured.", category="missing_key")

        # Serialized facts payload (strictly non-identifying)
        facts_payload = facts.model_dump(mode="json")

        system_prompt = (
            "You are an industrial resource efficiency assistant for manufacturing facilities. "
            "Explain resource consumption and intensity trends based ONLY on the provided aggregated operational facts.\n"
            "Rules:\n"
            "1. Strictly qualify every recommendation with 'where applicable'. Never claim a specific machine or process is faulty.\n"
            "2. Never mention company names, people, or external identifiers.\n"
            "3. Do not invent or alter numeric values.\n"
            "4. Output MUST be valid JSON strictly matching the InsightExplanation schema:\n"
            "   - 'summary': string, max 500 characters.\n"
            "   - 'possible_causes': array of strings, max 180 characters each, max 5 items.\n"
            "   - 'next_steps': array of strings, max 180 characters each, max 5 items.\n"
            "   - 'caveat': string, max 300 characters."
        )

        user_prompt = f"Operational facts for analysis:\n{json.dumps(facts_payload, indent=2)}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 600,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=body,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as err:
            logger.warning("OpenAI API request timed out after %ds", self.timeout)
            raise AiProviderError(f"Request timed out after {self.timeout}s.", category="timeout") from err
        except httpx.HTTPStatusError as err:
            logger.warning("OpenAI HTTP error: %s", err.response.status_code)
            raise AiProviderError(
                f"OpenAI service returned HTTP {err.response.status_code}.",
                category="http_error",
            ) from err
        except Exception as err:
            logger.warning("OpenAI communication error: %s", str(err))
            raise AiProviderError(f"Network error: {err}", category="network_error") from err

        try:
            content = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(content)
            explanation = InsightExplanation.model_validate(parsed_json)
            return explanation
        except (KeyError, json.JSONDecodeError, ValidationError) as err:
            logger.warning("OpenAI returned invalid or malformed schema: %s", str(err))
            raise AiProviderError(
                f"Failed to validate OpenAI structured output: {err}",
                category="schema_validation_error",
            ) from err


def get_explanation_provider(allow_external_ai: bool = False) -> tuple[ExplanationProvider, str]:
    """Factory returning (provider_instance, provider_name)."""
    if allow_external_ai and settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return OpenAiExplanationProvider(), "openai"
    return RulesExplanationProvider(), "rules"

