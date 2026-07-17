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
        "aet_datalayer": 483,
        "geopackage_status": "SUCCEEDED",
        "geopackage_url": "https://storage.googleapis.com/bucket/funding_report_1.gpkg?signature=...",
        "results": {
            "summary": {
                "ABOVEGROUND_TOTAL": [
                    {"year": 2026, "value": 320.5, "baseline": 5000.0, "delta": 6.41}
                ],
                "AET": {
                    "percentage": 25.0,
                    "improved_acres": 1234.5,
                    "total_project_area_acres": 5000.0,
                    "planning_area_acres": 6500.0,
                    "improved_area_percent": 18.99,
                },
                "BIOMASS_VOLUMES": {
                    "merchantable_softwood_bf": 1820.5,
                    "merchantable_hardwood_bf": 430.2,
                    "merchantable_mixed_bf": 95.1,
                    "non_merchantable_softwood_cuft": 12.4,
                    "non_merchantable_hardwood_cuft": 3.1,
                    "non_merchantable_mixed_cuft": 0.9,
                },
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
                "AET": [
                    {
                        "project_id": 14,
                        "improved_acres": 1234.5,
                        "total_acres": 5000.0,
                        "improved_area_percent": 24.69,
                    }
                ],
                "BIOMASS_VOLUMES": [
                    {
                        "project_id": 14,
                        "proj_id": None,
                        "merchantable_softwood_bf": 1820.5,
                        "merchantable_hardwood_bf": 430.2,
                        "merchantable_mixed_bf": 95.1,
                        "non_merchantable_softwood_cuft": 12.4,
                        "non_merchantable_hardwood_cuft": 3.1,
                        "non_merchantable_mixed_cuft": 0.9,
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
