"""
Skill-weighted blending for one gauge. Everything the dashboard shows per station
(weights, blend, spread, 90th percentile, IMD-threshold probabilities, alert,
10-day quantile curve) is derived here from three raw inputs:
observed rain, each model's forecast, and each model's recent 48h MAE.
"""

from math import erf, sqrt
from statistics import mean

# IMD 24h rainfall categories (mm)
HEAVY, VERY_HEAVY, EXTREME = 64.5, 115.6, 204.5
Z90 = 1.2816  # standard-normal 90th percentile

# Monsoon spell weakening over the 10-day horizon; uncertainty widens with lead time.
# ponytail: fixed decay shape for every gauge; drive it from model lead-time output when available
DECAY = [1.0, 0.86, 0.74, 0.63, 0.54, 0.46, 0.40, 0.35, 0.31, 0.27]

LABELS = {"gfs": "GFS / BharatFS", "ncum": "NCUM", "wrf": "WRF (3km)", "ecmwf": "ECMWF IFS HRES", "graphcast": "Google GraphCast", "aifs": "ECMWF AIFS"}
FAMILY = {"gfs": "Physics", "ncum": "Physics", "wrf": "Physics", "ecmwf": "Physics", "graphcast": "AI", "aifs": "AI"}


def p_exceed(mu: float, sigma: float, t: float) -> float:
    # capped: a forecast never states certainty
    return min(0.5 * (1 - erf((t - mu) / (sigma * sqrt(2)))), 0.99)


def blend(preds: dict, mae: dict) -> dict:
    inv = {m: 1 / mae[m] ** 2 for m in preds}  # inverse-square error weighting
    total = sum(inv.values())
    weights = {m: round(v / total, 2) for m, v in sorted(inv.items(), key=lambda kv: -kv[1])}
    w = {m: v / total for m, v in inv.items()}
    mu = sum(w[m] * preds[m] for m in preds)
    # spread of the weighted ensemble, floored so a tight cluster never claims certainty
    sigma = max(sqrt(sum(w[m] * (preds[m] - mu) ** 2 for m in preds)), 0.12 * mu, 2.0)
    top = max(weights, key=weights.get)
    return {
        "assigned_weights": weights,
        "consensus_blend": round(mu, 1),
        "simple_average": round(mean(preds.values()), 1),
        "worst_case_90th": round(mu + Z90 * sigma, 1),
        "disagreement_index": round(max(preds.values()) - min(preds.values()), 1),
        "p_heavy_rain": round(p_exceed(mu, sigma, HEAVY), 2),
        "p_very_heavy": round(p_exceed(mu, sigma, VERY_HEAVY), 2),
        "p_extremely_heavy": round(p_exceed(mu, sigma, EXTREME), 2),
        "dominant_model": LABELS.get(top, top),
        "dominant_family": FAMILY.get(top, "Ensemble"),
        "_sigma": sigma,
    }


def alert(name: str, b: dict):
    mu, p90 = b["consensus_blend"], b["worst_case_90th"]
    for level, t, key, cut in [("RED ALERT: Extremely heavy rainfall", EXTREME, "p_extremely_heavy", 0.4),
                               ("ORANGE ALERT: Very heavy rainfall", VERY_HEAVY, "p_very_heavy", 0.5),
                               ("YELLOW ALERT: Heavy rainfall", HEAVY, "p_heavy_rain", 0.6)]:
        if mu >= t or b[key] >= cut:
            return (f"{level} likely at {name} in the next 24h. AtmosFusion blend {mu} mm "
                    f"(90th pctl {p90} mm); P(≥{t} mm) {round(b[key] * 100)}%.")
    return None


def curve(b: dict, simple_avg: float) -> list:
    mu, sigma = b["consensus_blend"], b["_sigma"]
    out = []
    for day, k in enumerate(DECAY, start=1):
        m, s = mu * k, sigma * k * (1 + 0.1 * (day - 1))
        out.append({"lead_day": day, "p10": round(max(m - Z90 * s, 0), 1), "p50": round(m, 1),
                    "p90": round(m + Z90 * s, 1), "simple_avg": round(simple_avg * k, 1)})
    return out


if __name__ == "__main__":
    b = blend({"a": 10, "b": 30}, {"a": 1, "b": 3})
    assert abs(sum(b["assigned_weights"].values()) - 1) < 0.02
    assert 10 <= b["consensus_blend"] < 20, "skilled model must dominate"
    assert b["p_heavy_rain"] >= b["p_very_heavy"] >= b["p_extremely_heavy"]
    assert b["worst_case_90th"] > b["consensus_blend"]
    c = curve(b, b["simple_average"])
    assert len(c) == 10 and all(p["p10"] <= p["p50"] <= p["p90"] for p in c)
    assert alert("X", blend({"a": 250}, {"a": 1})).startswith("RED")
    print("blend self-check ok")
