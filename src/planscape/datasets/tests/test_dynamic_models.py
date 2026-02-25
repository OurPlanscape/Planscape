# tests/test_dynamic_runtime_model.py
from django.apps import apps
from django.contrib.gis.db import models as gism
from django.db import models as djm
from django.test import SimpleTestCase

from datasets.dynamic_models import (
    field_from_fiona,
    geometry_field_from_fiona,
    model_from_fiona,
    qualify_for_django,
    srid_from_crs,
)


class _DataLayerStub:
    """Minimal stub to satisfy model_from_fiona() signature/usage."""

    def __init__(self, info, table: str, model_name: str):
        self.info = info
        self.table = table
        self._model_name = model_name

    def get_model_name(self):
        return self._model_name


class TestHelperFunctions(SimpleTestCase):
    def test_srid_from_crs(self):
        self.assertEqual(srid_from_crs("EPSG:4269"), 4269)
        self.assertEqual(srid_from_crs("epsg:3857"), 3857)
        self.assertEqual(srid_from_crs("NAD83"), 4326)
        self.assertEqual(srid_from_crs(None), 4326)

    def test_geometry_field_from_fiona(self):
        self.assertIs(
            geometry_field_from_fiona("MultiPolygonZ"), gism.MultiPolygonField
        )
        self.assertIs(geometry_field_from_fiona("PointM"), gism.PointField)
        self.assertIs(geometry_field_from_fiona("LineString"), gism.LineStringField)
        self.assertIs(geometry_field_from_fiona(""), gism.GeometryField)
        self.assertIs(geometry_field_from_fiona("Unknown"), gism.GeometryField)

    def test_field_from_fiona(self):
        self.assertEqual(field_from_fiona("str:254"), ("str", 254, None))
        self.assertEqual(field_from_fiona("float:24.8"), ("float", None, (24, 8)))
        self.assertEqual(field_from_fiona("numeric:10.2"), ("numeric", None, (10, 2)))
        self.assertEqual(field_from_fiona("int64"), ("int64", None, None))
        self.assertEqual(field_from_fiona(""), ("", None, None))

    def test_qualify_for_django_ok_and_errors(self):
        self.assertEqual(qualify_for_django("client_a.cities"), '"client_a"."cities"')


class ModelFromFionalTests(SimpleTestCase):
    app_label = "datastore"  # must be present in INSTALLED_APPS

    # ---------- helpers ----------

    def addCleanup_unregister(self, app_label: str, model_name: str):
        def _unregister():
            try:
                apps.all_models[app_label].pop(model_name.lower(), None)
                apps.clear_cache()
            except Exception:
                pass

        self.addCleanup(_unregister)

    # ---------- fixtures ----------

    @staticmethod
    def single_layer_info():
        return {
            "crs": "EPSG:4269",
            "name": "private_lands",
            "count": 113,
            "bounds": [-124.41, 32.53, -114.13, 42.01],
            "driver": "ESRI Shapefile",
            "schema": {
                "geometry": "MultiPolygonZ",
                "properties": {
                    "name": "str:254",
                    "gid": "int64",
                    "pop": "float:24.8",  # stays FloatField
                    "price": "numeric:12.4",  # DecimalField(12,4)
                    "note": "foo",  # unknown -> TextField
                },
            },
        }

    @staticmethod
    def multi_layer_info():
        return {
            "layer_a": {
                "crs": "EPSG:3857",
                "name": "layer_a",
                "schema": {"geometry": "PointM", "properties": {"title": "str:40"}},
            },
            "layer_b": {
                "crs": "EPSG:4326",
                "name": "layer_b",
                "schema": {"geometry": "Polygon", "properties": {"class": "str:10"}},
            },
        }

    def test_single_layer_maps_fields_and_meta(self):
        info = self.single_layer_info()
        dl = _DataLayerStub(
            info=info, table="foo.private_lands", model_name="PrivateLandsA"
        )

        Model = model_from_fiona(dl)
        self.addCleanup_unregister(self.app_label, "PrivateLandsA")

        # Registry returns the same class
        fetched = apps.get_model(self.app_label, "PrivateLandsA")
        self.assertIs(fetched, Model)

        # db_table schema qualification
        self.assertEqual(Model._meta.db_table, '"foo"."private_lands"')

        # Geometry
        geom = Model._meta.get_field("geometry")
        self.assertIsInstance(geom, gism.MultiPolygonField)
        self.assertEqual(geom.srid, 4269)

        # Scalars
        name = Model._meta.get_field("name")
        self.assertIsInstance(name, djm.CharField)
        self.assertEqual(name.max_length, 254)
        self.assertTrue(name.null)
        self.assertTrue(name.blank)

        gid = Model._meta.get_field("gid")
        self.assertIsInstance(gid, djm.BigIntegerField)

        pop = Model._meta.get_field("pop")
        self.assertIsInstance(pop, djm.FloatField)

        price = Model._meta.get_field("price")
        self.assertIsInstance(price, djm.DecimalField)
        self.assertEqual(price.max_digits, 12)
        self.assertEqual(price.decimal_places, 4)

        note = Model._meta.get_field("note")
        self.assertIsInstance(note, djm.TextField)

        # Surrogate PK
        self.assertIsInstance(Model._meta.pk, djm.BigAutoField)
        self.assertEqual(Model._meta.pk.attname, "id")

    def test_idempotent_returns_existing(self):
        info = self.single_layer_info()
        dl = _DataLayerStub(
            info=info, table="foo.private_lands", model_name="PrivateLandsB"
        )

        first = model_from_fiona(dl)
        self.addCleanup_unregister(self.app_label, "PrivateLandsB")
        second = model_from_fiona(dl)

        self.assertIs(first, second)

    def test_multi_layer_uses_first_layer(self):
        info = self.multi_layer_info()
        dl = _DataLayerStub(
            info=info, table="foo.points_tbl", model_name="LayerAAsModel"
        )

        Model = model_from_fiona(dl)
        self.addCleanup_unregister(self.app_label, "LayerAAsModel")

        geom = Model._meta.get_field("geometry")
        self.assertIsInstance(geom, gism.PointField)
        self.assertEqual(geom.srid, 4269)  # SRID always 4269 as imported

        title = Model._meta.get_field("title")
        self.assertIsInstance(title, djm.CharField)
        self.assertEqual(title.max_length, 40)

        self.assertEqual(Model._meta.db_table, '"foo"."points_tbl"')

    def test_empty_info_raises(self):
        dl = _DataLayerStub(info=None, table="anything", model_name="Broken")
        with self.assertRaisesMessage(ValueError, "Empty Fiona info."):
            model_from_fiona(dl)

    def test_decimal_defaults_when_precision_missing(self):
        info = {
            "crs": "EPSG:4326",
            "name": "prices",
            "schema": {"geometry": "Polygon", "properties": {"amount": "decimal"}},
        }
        dl = _DataLayerStub(
            info=info, table="bar.prices", model_name="PricesDefaultDecimal"
        )

        Model = model_from_fiona(dl)
        self.addCleanup_unregister(self.app_label, "PricesDefaultDecimal")

        amount = Model._meta.get_field("amount")
        self.assertIsInstance(amount, djm.DecimalField)
        self.assertEqual(amount.max_digits, 10)
        self.assertEqual(amount.decimal_places, 2)
