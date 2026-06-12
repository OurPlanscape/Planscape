from drf_spectacular.utils import OpenApiExample

FLAME_LENGTH_REDUCTION_RESPONSE_EXAMPLE = OpenApiExample(
    "Flame length reduction response",
    value={
        "interval": {"from": 7.0, "to": 4.0},
        "summary": [
            {
                "year": 2026,
                "value": 320.5,
                "baseline": 5000.0,
                "delta": 6.41,
                "interval": {"from": 7.0, "to": 4.0},
            }
        ],
        "projects": [
            {
                "project_id": 14,
                "proj_id": None,
                "year": 2026,
                "value": 80.0,
                "baseline": 1000.0,
                "delta": 8.0,
                "interval": {"from": 7.0, "to": 4.0},
            }
        ],
    },
    response_only=True,
)
