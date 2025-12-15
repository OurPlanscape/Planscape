from django.conf import settings
from django.db import migrations

from datasets.models import (
    DataLayerType,
    PreferredDisplayType,
    SelectionTypeOptions,
    VisibilityOptions,
)

OWNERSHIP_LAYERS = [
    "Bureau of Indian Affairs",
    "Bureau of Land Management",
    "Bureau of Reclamation",
    "City",
    "County",
    "Department of Defense",
    "Department of Energy",
    "National Park Service",
    "Other Federal",
    "Other Local",
    "Private",
    "State",
    "Tribal Lands",
    "United States Fish and Wildlife Service",
    "United States Forest Service",
]

DISTURBANCES_LAYERS = [
    "Existing Projects (CA)",
    "Prescribed Burns Through 2022 - CA",
    "InterAgency Fire Perimeters 1990–1999",
    "InterAgency Fire Perimeters 2000–2009",
    "InterAgency Fire Perimeters 2020–2024",
    "InterAgency Fire Perimeters 2010–2019",
]

BOUNDARIES_LAYERS = [
    "PODs",
    "Watersheds (HUC-12)",
    "Subfiresheds",
]

PROTECTED_AREAS_LAYERS = []

RASTER_DATASETS = [
    "California Landscape Metrics",
    "Future Climate Conditions",
    "Wildfire Risk to Communities",
    "LANDFIRE 2024",
    "TreeMap FVS 2020",
]


def handle(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    user = User.objects.filter(email=settings.DEFAULT_ADMIN_EMAIL).first()
    org = Organization.objects.filter(name=settings.DEFAULT_ORGANIZATION_NAME).first()

    for raster_dataset_name in RASTER_DATASETS:
        print(f"CONFIGURING RASTER DATASET {raster_dataset_name}.")
        raster_dataset = Dataset.objects.filter(name=raster_dataset_name).first()
        if not raster_dataset:
            print(f"COULD NOT FIND {raster_dataset_name}. INVESTIGATE!")
            continue
        raster_dataset.preferred_display_type = PreferredDisplayType.MAIN_DATALAYERS
        raster_dataset.selection_type = SelectionTypeOptions.SINGLE
        raster_dataset.save()
        print(f"CONFIGURED {raster_dataset.name} AS MAIN AND SINGLE.")

    ownership = Dataset.objects.create(
        created_by=user,
        organization=org,
        visibility=VisibilityOptions.PUBLIC,
        selection_type=SelectionTypeOptions.MULTIPLE,
        preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        name="Ownership",
    )
    old_dataset = Dataset.objects.get(pk=999)
    disturbances = Dataset.objects.create(
        created_by=user,
        organization=org,
        visibility=VisibilityOptions.PUBLIC,
        selection_type=SelectionTypeOptions.SINGLE,
        preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        name="Disturbances",
    )
    boundaries = Dataset.objects.create(
        created_by=user,
        organization=org,
        visibility=VisibilityOptions.PUBLIC,
        selection_type=SelectionTypeOptions.SINGLE,
        preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        name="Boundaries",
    )
    protected_areas = Dataset.objects.create(
        created_by=user,
        organization=org,
        visibility=VisibilityOptions.PUBLIC,
        selection_type=SelectionTypeOptions.MULTIPLE,
        preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        name="Protected Areas",
    )

    dataset_groups = {
        ownership: OWNERSHIP_LAYERS,
        disturbances: DISTURBANCES_LAYERS,
        boundaries: BOUNDARIES_LAYERS,
    }

    for key, layers in dataset_groups.items():
        print(f"PROCESSING {key.name}")
        for layer_name in layers:
            print(f"MOVING {layer_name}")
            layer = DataLayer.objects.filter(
                dataset=old_dataset,
                name=layer_name,
                type=DataLayerType.VECTOR,
            ).first()

            if not layer:
                print(
                    f"{layer_name} could not be found in {old_dataset.name}. Skipping."
                )
                continue

            layer.dataset = key
            layer.save()
            print(f"MOVED {layer.name} FROM {old_dataset.name} TO {key.name} DATASET.")
    old_datalayer_count = old_dataset.datalayers.all().count()
    if old_datalayer_count > 0:
        print(
            f"WE STILL HAVE {old_datalayer_count} LAYERS IN {old_dataset.name}. INVESTIGATE."
        )
        return

    print(f"OLD DATASET {old_dataset.name} NO LONGER HAS ANY DATALAYERS. DELETING IT.")
    old_dataset.delete()
    print(f"OLD DATASET {old_dataset.name} DELETED.")


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_alter_organization_options"),
        ("datasets", "0024_add_climate_foresight_styles"),
    ]

    operations = [migrations.RunPython(handle, migrations.RunPython.noop)]
