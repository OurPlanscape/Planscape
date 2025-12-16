# datasets/migrations/0024_add_climate_foresight_styles.py
"""
Add predefined raster styles for Climate Foresight outputs.

These styles define the color schemes for:
- MPAT Matrix (categorical: weak/strong for Monitor, Protect, Adapt, Transform)
- Adapt-Protect Score (continuous 0-100)
- Integrated Condition Score (continuous 0-100)
- Current Conditions Translated (continuous 0-1)
- Future Conditions (continuous 0-100)
"""

from __future__ import annotations

import json
from typing import Any, Dict

import mmh3
from django.conf import settings
from django.db import IntegrityError, migrations

MPAT_MATRIX_STYLE: Dict[str, Any] = {
    "map_type": "VALUES",
    "no_data": {
        "values": [255],
        "color": None,
        "opacity": 0,
        "label": "No Data",
    },
    "entries": [
        {"value": 10, "color": "#b7d6e8", "opacity": 1.0, "label": "Weak Monitor"},
        {"value": 11, "color": "#4a6d8c", "opacity": 1.0, "label": "Strong Monitor"},
        {"value": 20, "color": "#c7d9c4", "opacity": 1.0, "label": "Weak Protect"},
        {"value": 21, "color": "#5a7d5a", "opacity": 1.0, "label": "Strong Protect"},
        {"value": 30, "color": "#f2c89c", "opacity": 1.0, "label": "Weak Adapt"},
        {"value": 31, "color": "#c47b38", "opacity": 1.0, "label": "Strong Adapt"},
        {"value": 40, "color": "#d8a3a3", "opacity": 1.0, "label": "Weak Transform"},
        {"value": 41, "color": "#8c4a4a", "opacity": 1.0, "label": "Strong Transform"},
    ],
}

ADAPT_PROTECT_SCORE_STYLE: Dict[str, Any] = {
    "map_type": "RAMP",
    "no_data": {
        "values": [-9999],
        "color": None,
        "opacity": 0,
        "label": "No Data",
    },
    "entries": [
        {"value": 0, "color": "#f6c8b4", "opacity": 1.0, "label": "Adapt/Protect"},
        {
            "value": 100,
            "color": "#a2cde2",
            "opacity": 1.0,
            "label": "Monitor/Transform",
        },
    ],
}


INTEGRATED_CONDITION_SCORE_STYLE: Dict[str, Any] = {
    "map_type": "RAMP",
    "no_data": {
        "values": [-9999],
        "color": None,
        "opacity": 0,
        "label": "No Data",
    },
    "entries": [
        {"value": 0, "color": "#d53c54", "opacity": 1.0, "label": "Transform"},
        {"value": 50, "color": "#ffffff", "opacity": 1.0, "label": "Adapt/Protect"},
        {"value": 100, "color": "#0571b0", "opacity": 1.0, "label": "Monitor"},
    ],
}

CURRENT_CONDITIONS_TRANSLATED_STYLE: Dict[str, Any] = {
    "map_type": "RAMP",
    "no_data": {
        "values": [-9999],
        "color": None,
        "opacity": 0,
        "label": "No Data",
    },
    "entries": [
        {"value": 0.0, "color": "#1a9850", "opacity": 1.0, "label": "0"},
        {"value": 0.5, "color": "#fee08b", "opacity": 1.0, "label": "0.5"},
        {"value": 1.0, "color": "#d73027", "opacity": 1.0, "label": "1"},
    ],
}

# Style definitions with their names
CLIMATE_FORESIGHT_STYLES: Dict[str, Dict[str, Any]] = {
    "cf-mpat-matrix": MPAT_MATRIX_STYLE,
    "cf-adapt-protect-score": ADAPT_PROTECT_SCORE_STYLE,
    "cf-integrated-condition-score": INTEGRATED_CONDITION_SCORE_STYLE,
    "cf-current-conditions": CURRENT_CONDITIONS_TRANSLATED_STYLE,
}


def add_styles(apps, schema_editor):
    """
    Seed Climate Foresight raster styles.
    """
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    Style = apps.get_model("datasets", "Style")

    user = User.objects.filter(email=settings.DEFAULT_ADMIN_EMAIL).first()
    org = Organization.objects.filter(name=settings.DEFAULT_ORGANIZATION_NAME).first()

    for style_name, style_data in CLIMATE_FORESIGHT_STYLES.items():
        try:
            data_hash = mmh3.hash_bytes(json.dumps(style_data)).hex()
            Style.objects.create(
                name=style_name,
                organization=org,
                created_by=user,
                type="RASTER",
                data=style_data,
                data_hash=data_hash,
            )
        except IntegrityError:
            # If organisation+name+type already exists, silently skip
            continue


def remove_styles(apps, schema_editor):
    """
    Reverse operation: delete the seeded styles.
    """
    Organization = apps.get_model("organizations", "Organization")
    Style = apps.get_model("datasets", "Style")

    org = Organization.objects.get(name=settings.DEFAULT_ORGANIZATION_NAME)
    Style.objects.filter(
        organization=org, name__in=CLIMATE_FORESIGHT_STYLES.keys()
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_alter_organization_options"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("datasets", "0023_alter_dataset_preferred_display_type_and_more"),
    ]

    operations = [
        migrations.RunPython(add_styles, remove_styles),
    ]
