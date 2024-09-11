from django.test import TestCase
from impacts.models import (
    ImpactVariable,
    ImpactVariableAggregation,
    TreatmentPrescriptionAction,
)


class TestImpactVariable(TestCase):
    def test_s3_path_returns_correctly_with_action(self):
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        year = 2024
        action = TreatmentPrescriptionAction.MASTICATION_RX_FIRE
        s3_path = ImpactVariable.s3_path(variable, year, action)
        self.assertEqual(
            s3_path,
            "s3://planscape-control-dev/rasters/impacts/Treatment_9_2024_cbh_3857_COG.tif",
        )

    def test_s3_path_returns_correctly_without_action_returns_baseline(self):
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        year = 2024
        action = None
        s3_path = ImpactVariable.s3_path(variable, year, action)
        self.assertEqual(
            s3_path,
            "s3://planscape-control-dev/rasters/impacts/Baseline_2024_cbh_3857_COG.tif",
        )
