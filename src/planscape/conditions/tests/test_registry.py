from django.test import TestCase
from pathlib import Path
from django.conf import settings
from conditions.registry import get_raster_path, get_tile_name
from conditions.models import BaseCondition, Condition


class TestRegistry(TestCase):
    def test_get_raster_path_returns_path_object(self):
        condition = Condition(
            raster_name="central-coast/airQuality/Tier1/Vulner_PM25_Severe_2022.tif"
        )
        path = get_raster_path(condition)
        assert path is not None
        assert isinstance(path, Path)

    def test_get_raster_path_str_is_correct(self):
        condition = Condition(
            raster_name="central-coast/airQuality/Tier1/Vulner_PM25_Severe_2022.tif"
        )
        actual = get_raster_path(condition)
        expected = Path(settings.RASTER_ROOT) / Path(condition.raster_name)
        self.assertEqual(actual, expected)

    def test_get_tile_name_returns_str(self):
        base = BaseCondition(region_name="foo", condition_name="bar")
        condition = Condition(
            condition_dataset=base,
            raster_name="central-coast/airQuality/Tier1/Vulner_PM25_Severe_2022.tif",
            condition_score_type=0,  # future
            is_raw=True,
        )

        actual = get_tile_name(condition)
        expected = "foo:bar_current_raw"
        self.assertEquals(actual, expected)
