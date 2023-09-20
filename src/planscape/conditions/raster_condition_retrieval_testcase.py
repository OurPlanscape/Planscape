import numpy as np

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.db import connection
from django.test import TestCase
from planscape import settings


class RasterRetrievalTestCase(TestCase):
    def setUp(self) -> None:
        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        with connection.cursor() as cursor:
            query = (
                "insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')"
            ).format(settings.CRS_9822_PROJ4)
            cursor.execute(query)

        self.xorig = -2116971
        self.yorig = 2100954
        self.xscale = 300
        self.yscale = -300

    def _create_geo(self, xmin: int, xmax: int, ymin: int, ymax: int) -> MultiPolygon:
        # ST_Clip seems to include pixels up to round((coord-origin)/scale) - 1.
        buffer = 0.6

        polygon = Polygon(
            (
                (self.xorig + xmin * self.xscale, self.yorig + ymin * self.yscale),
                (
                    self.xorig + xmin * self.xscale,
                    self.yorig + (ymax + buffer) * self.yscale,
                ),
                (
                    self.xorig + (xmax + buffer) * self.xscale,
                    self.yorig + (ymax + buffer) * self.yscale,
                ),
                (
                    self.xorig + (xmax + buffer) * self.xscale,
                    self.yorig + ymin * self.yscale,
                ),
                (self.xorig + xmin * self.xscale, self.yorig + ymin * self.yscale),
            )
        )
        geo = MultiPolygon(polygon)
        geo.srid = settings.CRS_FOR_RASTERS
        return geo

    def _create_raster(self, width: int, height: int, data: tuple) -> GDALRaster:
        raster = GDALRaster(
            {
                "srid": settings.CRS_FOR_RASTERS,
                "width": width,
                "height": height,
                "scale": [self.xscale, self.yscale],
                "skew": [0, 0],
                "origin": [self.xorig, self.yorig],
                "bands": [{"data": data, "nodata_value": np.nan}],
            }
        )
        return raster


class RasterConditionRetrievalTestCase(RasterRetrievalTestCase):
    def setUp(self) -> None:
        RasterRetrievalTestCase.setUp(self)

        self.region = "sierra-nevada"

    def _create_condition_raster(
        self, condition_raster: GDALRaster, condition_raster_name: str
    ) -> None:
        ConditionRaster.objects.create(
            name=condition_raster_name, raster=condition_raster
        )

    def _save_condition_to_db(
        self,
        condition_name: str,
        condition_raster_name: str,
        condition_raster: GDALRaster,
    ) -> int:
        base_condition = BaseCondition.objects.create(
            condition_name=condition_name,
            region_name=self.region,
            condition_level=ConditionLevel.METRIC,
        )
        condition = Condition.objects.create(
            raster_name=condition_raster_name,
            condition_dataset=base_condition,
            is_raw=False,
        )
        self._create_condition_raster(condition_raster, condition_raster_name)
        return condition.pk
