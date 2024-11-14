from django.conf import settings
from django.test import TestCase
from datasets.models import DataLayerType
from organizations.tests.factories import OrganizationFactory
from datasets.tests.factories import DataLayerFactory
from impacts.models import (
    ImpactVariable,
    TreatmentPrescriptionAction,
)


class TestImpactVariable(TestCase):
    def setUp(self):
        self.org = OrganizationFactory.create(name=settings.MAIN_ORG_NAME)

    def test_s3_path_returns_correctly_with_action(self):
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        year = 2024
        action = TreatmentPrescriptionAction.MASTICATION_RX_FIRE
        metadata = {
            "modules": {
                "impacts": {
                    "year": year,
                    "baseline": False,
                    "variable": variable,
                    "action": TreatmentPrescriptionAction.get_file_mapping(action),
                }
            }
        }
        DataLayerFactory.create(
            organization=self.org,
            metadata=metadata,
            type=DataLayerType.RASTER,
            url="s3://planscape-control-dev/datalayers/1/Baseline_2024_cbh_3857_COG.tif",
        )

        s3_path = ImpactVariable.get_impact_raster_path(
            impact_variable=variable,
            action=action,
            year=year,
        )
        self.assertEqual(
            s3_path,
            "s3://planscape-control-dev/datalayers/1/Baseline_2024_cbh_3857_COG.tif",
        )

    def test_s3_path_returns_correctly_without_action_returns_baseline(self):
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        year = 2024
        action = None
        metadata = {
            "modules": {
                "impacts": {
                    "year": year,
                    "baseline": True,
                    "variable": str(variable),
                    "action": action,
                }
            }
        }
        DataLayerFactory.create(
            organization=self.org,
            metadata=metadata,
            type=DataLayerType.RASTER,
            url="s3://planscape-control-dev/datalayers/1/Baseline_2024_cbh_3857_COG.tif",
        )

        s3_path = ImpactVariable.get_impact_raster_path(
            impact_variable=variable,
            action=action,
            year=year,
        )
        self.assertEqual(
            s3_path,
            "s3://planscape-control-dev/datalayers/1/Baseline_2024_cbh_3857_COG.tif",
        )
