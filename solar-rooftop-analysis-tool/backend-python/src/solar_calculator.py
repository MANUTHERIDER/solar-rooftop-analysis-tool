# backend-python/src/solar_calculator.py
# (Existing code, ensure this file is present and correct)

import json
import os

class SolarCalculator:
    def __init__(self):
        self.params = self._load_default_params()

    def _load_default_params(self) -> dict:
        file_path = os.path.join(os.path.dirname(__file__), '../data/default_params.json')
        if not os.path.exists(file_path):
            print(f"Warning: default_params.json not found at {file_path}. Using hardcoded fallback values.")
            return {
                "panel_efficiency_percent": 20.0,
                "system_cost_per_watt_usd": 3.0,
                "federal_tax_credit_percent": 30.0,
                "average_electricity_price_kwh_usd": 0.15,
                "system_lifespan_years": 25,
                "degradation_rate_percent_per_year": 0.5,
                "average_daily_peak_sun_hours": 4.5,
                "shading_impact_factor": {
                    "low": 1.0, "medium": 0.85, "high": 0.70, "negligible": 1.0, "significant": 0.70, "unknown": 0.90
                },
                "orientation_impact_factor": {
                    "South": 1.0, "South-East": 0.95, "South-West": 0.95, "East": 0.85, "West": 0.85, "North": 0.60,
                    "Flat": 0.90, "Multi-directional": 0.90, "Unknown": 0.90
                },
                "panel_wattage_per_sqm": 200,
                "typical_panel_area_sqm": 1.7 # Added for max panel count estimation
            }
        with open(file_path, 'r') as f:
            return json.load(f)

    def calculate_potential(self, usable_area_sqm: float, orientation: str, shading_level: str) -> dict:
        params = self.params

        usable_area_sqm = max(0.0, usable_area_sqm)
        orientation = orientation if orientation in params["orientation_impact_factor"] else "Unknown"
        shading_level = shading_level if shading_level in params["shading_impact_factor"] else "unknown"

        total_panel_wattage = usable_area_sqm * params["panel_wattage_per_sqm"]
        estimated_system_size_kw = total_panel_wattage / 1000

        average_daily_peak_sun_hours = params.get("average_daily_peak_sun_hours", 4.5)

        production_adjustment = (
            params["shading_impact_factor"][shading_level] *
            params["orientation_impact_factor"][orientation]
        )

        estimated_annual_kwh_production = (
            estimated_system_size_kw *
            average_daily_peak_sun_hours *
            365 *
            production_adjustment
        )

        total_installation_cost_usd = estimated_system_size_kw * params["system_cost_per_watt_usd"] * 1000

        federal_tax_credit_amount_usd = total_installation_cost_usd * (params["federal_tax_credit_percent"] / 100)
        net_cost_after_incentives_usd = total_installation_cost_usd - federal_tax_credit_amount_usd

        estimated_annual_electricity_savings_usd = estimated_annual_kwh_production * params["average_electricity_price_kwh_usd"]

        if estimated_annual_electricity_savings_usd > 0:
            payback_period_years = net_cost_after_incentives_usd / estimated_annual_electricity_savings_usd
        else:
            payback_period_years = float('inf')

        total_savings_over_lifespan = 0
        current_annual_production = estimated_annual_kwh_production
        for year in range(params["system_lifespan_years"]):
            total_savings_over_lifespan += current_annual_production * params["average_electricity_price_kwh_usd"]
            current_annual_production *= (1 - (params["degradation_rate_percent_per_year"] / 100))

        roi_over_lifespan_usd = total_savings_over_lifespan - net_cost_after_incentives_usd
        roi_percentage = (roi_over_lifespan_usd / net_cost_after_incentives_usd) * 100 if net_cost_after_incentives_usd > 0 else 0

        if estimated_annual_kwh_production > 5000 and payback_period_years < 10:
            solar_potential_rating = "High"
        elif estimated_annual_kwh_production > 2000 and payback_period_years < 15:
            solar_potential_rating = "Medium"
        else:
            solar_potential_rating = "Low"

        estimated_max_panel_count = int(usable_area_sqm / params.get("typical_panel_area_sqm", 1.7))

        return {
            "solar_potential_rating": solar_potential_rating,
            "estimated_system_size_kw": round(estimated_system_size_kw, 2),
            "estimated_annual_kwh_production": round(estimated_annual_kwh_production, 2),
            "cost_analysis": {
                "total_installation_cost_usd": round(total_installation_cost_usd, 2),
                "federal_tax_credit_amount_usd": round(federal_tax_credit_amount_usd, 2),
                "net_cost_after_incentives_usd": round(net_cost_after_incentives_usd, 2),
                "estimated_annual_electricity_savings_usd": round(estimated_annual_electricity_savings_usd, 2)
            },
            "roi_analysis": {
                "payback_period_years": round(payback_period_years, 1) if payback_period_years != float('inf') else "N/A (No savings)",
                "roi_over_lifespan_usd": round(roi_over_lifespan_usd, 2),
                "roi_percentage": round(roi_percentage, 1)
            },
            "assumptions": {
                "panel_efficiency_percent": params["panel_efficiency_percent"],
                "system_cost_per_watt_usd": params["system_cost_per_watt_usd"],
                "federal_tax_credit_percent": params["federal_tax_credit_percent"],
                "average_electricity_price_kwh_usd": params["average_electricity_price_kwh_usd"],
                "system_lifespan_years": params["system_lifespan_years"],
                "degradation_rate_percent_per_year": params["degradation_rate_percent_per_year"],
                "average_daily_peak_sun_hours": average_daily_peak_sun_hours,
                "typical_panel_area_sqm": params.get("typical_panel_area_sqm", 1.7)
            },
            "estimated_max_panel_count": estimated_max_panel_count
        }