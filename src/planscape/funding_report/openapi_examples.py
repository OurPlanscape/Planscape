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
            }
        ],
    },
    response_only=True,
)

FUNDING_OPPORTUNITY_REPORT_RESPONSE_EXAMPLE = OpenApiExample(
    "Funding opportunity report",
    value={
        "id": 1,
        "scenario": 14,
        "created_by": 3,
        "created_at": "2026-06-01T00:00:00Z",
        "updated_at": "2026-06-01T00:05:00Z",
        "status": "SUCCESS",
        "treatment_datalayer": 482,
        "results": {
            "summary": {
                "ABOVEGROUND_TOTAL": [
                    {"year": 2026, "value": 320.5, "baseline": 5000.0, "delta": 6.41}
                ],
            },
            "projects": {
                "ABOVEGROUND_TOTAL": [
                    {
                        "project_id": 14,
                        "proj_id": None,
                        "year": 2026,
                        "value": 80.0,
                        "baseline": 1000.0,
                        "delta": 8.0,
                    }
                ],
            },
            "treatment_areas": {
                "projects": {
                    "101": {
                        "Rx Burn": 12.34,
                        "Thin and Rx Burn": 5.67,
                        "No Treatment": 2.10,
                    },
                    "102": {
                        "No Treatment": 8.45,
                    },
                },
                "total": {
                    "Rx Burn": 12.34,
                    "Thin and Rx Burn": 5.67,
                    "No Treatment": 10.55,
                },
            },
        },
    },
    response_only=True,
)
