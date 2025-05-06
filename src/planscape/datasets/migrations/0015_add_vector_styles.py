# datasets/migrations/0015_seed_default_styles.py
from __future__ import annotations


from typing import Any, Dict

from django.conf import settings
from django.db import IntegrityError, migrations

from datasets.services import create_style
from datasets.models import DataLayerType  # noqa


STYLES: Dict[str, Dict[str, str]] = {
    "steel-blue": {"fill-color": "#778899", "fill-outline-color": "#778899"},
    "brick-red": {"fill-color": "#B06565", "fill-outline-color": "#B06565"},
    "soft-gray": {"fill-color": "#D3D3D3", "fill-outline-color": "#898989"},
    "soft-blue": {"fill-color": "#A6CEE3", "fill-outline-color": "#A6CEE3"},
    "lilac-purple": {"fill-color": "#CAB2D6", "fill-outline-color": "#CAB2D6"},
    "grapefruit": {"fill-color": "#FA8072", "fill-outline-color": "#FA8072"},
    "soft-yellow": {"fill-color": "#FFEDA0", "fill-outline-color": "#898989"},
    "lime-green": {"fill-color": "#B2DF8A", "fill-outline-color": "#B2DF8A"},
    "yolk-yellow": {"fill-color": "#F5DEB3", "fill-outline-color": "#898989"},
    "light-blush": {"fill-color": "#F0D3F7", "fill-outline-color": "#898989"},
    "light-orange": {"fill-color": "#FDBF6F", "fill-outline-color": "#FDBF6F"},
    "ocean-blue": {"fill-color": "#4682B4", "fill-outline-color": "#4682B4"},
    "brown": {"fill-color": "#BC8F8F", "fill-outline-color": "#BC8F8F"},
    "grass-green": {"fill-color": "#9ACD32", "fill-outline-color": "#9ACD32"},
    "sky-blue": {"fill-color": "#87CEFA", "fill-outline-color": "#87CEFA"},
}


def add_styles(apps, schema_editor):
    """
    Seed default vector‑fill styles using the high‑level service helper.
    """
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    Style = apps.get_model("datasets", "Style")  # for the reverse migration

    user = User.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)
    org = Organization.objects.get(name=settings.DEFAULT_ORGANIZATION_NAME)

    for style_name, style_data in STYLES.items():
        try:
            create_style(
                name=style_name,
                organization=org,
                created_by=user,
                type=DataLayerType.VECTOR,
                data=style_data,
                datalayers=None,
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
    Style.objects.filter(organization=org, name__in=STYLES.keys()).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("datasets", "0012_auto_20250418_1307"), 
        ("organizations", "0004_alter_organization_options"), 
        ("auth", "0012_alter_user_first_name_max_length"), 
    ]

    operations = [
        migrations.RunPython(add_styles, remove_styles),
    ]
