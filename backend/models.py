"""
AtmosFusion: Hybrid AI–NWP Multi-Model Forecast Blending System
Pydantic Schema Definitions — NCMRWF / MoES / SIH26081
"""

from pydantic import BaseModel
from typing import List, Dict, Optional


class WeatherStation(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    elevation_m: int
    terrain_type: str
    reach_km: float           # representative radius of the gauge (WMO density class)
    observed_rain_24h: float
    model_predictions: Dict[str, float]
    assigned_weights: Dict[str, float]
    recent_mae_48h: Dict[str, float]
    consensus_blend: float
    simple_average: float
    worst_case_90th: float
    p_heavy_rain: float       # P(Rain >= 64.5 mm)
    p_very_heavy: float       # P(Rain >= 115.6 mm)
    p_extremely_heavy: float  # P(Rain >= 204.5 mm)
    active_alert: Optional[str] = None
    dominant_model: str
    dominant_family: str       # "Physics", "Ensemble", "AI"
    shap_explanation: str
    disagreement_index: float  # max - min across models (mm)


class RegionForecast(BaseModel):
    region_name: str
    regime: str
    regime_confidence: float
    season: str
    lead_day: int
    stations: List[WeatherStation]


class VerificationRow(BaseModel):
    model_name: str
    model_type: str
    day1_rmse: float
    day3_rmse: float
    heavy_rain_ets: float
    extreme_rain_csi: float
    crps_score: float


class QuantileCurvePoint(BaseModel):
    lead_day: int
    p10: float
    p50: float
    p90: float
    simple_avg: float


class HealthResponse(BaseModel):
    status: str
    service: str
    grid_cells_synced: int
    mesh_resolution: str
    regime_engine: str
    last_cycle: str
