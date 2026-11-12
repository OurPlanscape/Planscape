"""
Seed the default raster style for Funding Report burn simulation datalayers.

Zero and NODATA pixels are transparent; every other value (floats in the
(0, 2] range, clamped beyond it) is painted #d92a07.
"""

from __future__ import annotations

import json
from typing import Any, Dict

import mmh3
from django.conf import settings
from django.db import migrations

BURN_SIMULATION_STYLE_NAME = "funding-report-burn-simulation"

BURN_SIMULATION_STYLE: Dict[str, Any] = {
    "map_type": "RAMP",
    "no_data": {
        "values": [0, "nan"],
        "color": None,
        "opacity": 0,
        "label": "No Data",
    },
    "entries": [
        {"value": 0, "color": "#d92a07", "opacity": 1.0, "label": "0"},
        {"value": 2, "color": "#d92a07", "opacity": 1.0, "label": "2"},
    ],
}


def add_style(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    Style = apps.get_model("datasets", "Style")
    Workspace = apps.get_model("workspaces", "Workspace")

    user = User.objects.filter(email=settings.DEFAULT_ADMIN_EMAIL).first()
    if user is None:
        # Fresh databases (e.g. tests) have no admin user; Style.created_by is
        # required, so there is nothing to seed.
        return

    org = Organization.objects.filter(name=settings.DEFAULT_ORGANIZATION_NAME).first()
    workspace = Workspace.objects.filter(name="Default", visibility="PUBLIC").first()

    Style.objects.get_or_create(
        organization=org,
        name=BURN_SIMULATION_STYLE_NAME,
        type="RASTER",
        defaults={
            "created_by": user,
            "workspace": workspace,
            "data": BURN_SIMULATION_STYLE,
            "data_hash": mmh3.hash_bytes(json.dumps(BURN_SIMULATION_STYLE)).hex(),
        },
    )


def remove_style(apps, schema_editor):
    Style = apps.get_model("datasets", "Style")
    Style.objects.filter(name=BURN_SIMULATION_STYLE_NAME, type="RASTER").delete()


class Migration(migrations.Migration):
    dependencies = [
        (
            "funding_report",
            "0013_remove_fundingopportunityreport_burn_simulation_results",
        ),
        ("datasets", "0034_alter_catalog_uuids"),
        ("organizations", "0004_alter_organization_options"),
        ("workspaces", "0002_create_default_workspace"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(add_style, remove_style),
    ]
