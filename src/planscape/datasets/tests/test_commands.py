from django.test import TestCase
from pathlib import Path

from datasets.management.commands.datalayers import get_datalayer_metadata


class DataLayerCreateTest(TestCase):
    def test_file_metadata_qgis(self):
        path = Path("datasets/tests/assets/qgis_metadata.tif")
        metadata = get_datalayer_metadata(path)
        self.assertIsNotNone(metadata)

        metadata_obj = metadata.get("metadata")
        self.assertIsNotNone(metadata_obj)
        self.assertEqual(
            metadata_obj.keys(),
            {"hierarchylevel", "identifier", "language", "parentidentifier"},
        )

        identification = metadata.get("identification")
        self.assertIsNotNone(identification)
        self.assertEqual(
            identification.keys(),
            {
                "language",
                "title",
                "abstract",
                "fees",
                "accessconstraints",
                "license",
                "keywords",
                "extents",
            },
        )

        distribution = metadata.get("distribution")
        self.assertIsNotNone(distribution)
        self.assertEqual(distribution.keys(), {"planscape"})

        contact = metadata.get("contact")
        self.assertIsNotNone(contact)
        self.assertEqual(
            contact.keys(),
            {
                "address",
                "city",
                "country",
                "postalcode",
                "email",
                "fax",
                "voice",
                "name",
                "organization",
                "position",
                "role",
            },
        )

        self.assertIsNotNone(metadata.get("crs"))

    def test_file_metadata_iso_19139_xml(self):
        path = Path("datasets/tests/assets/iso19139_metadata.tif")
        metadata = get_datalayer_metadata(path)
        self.assertIsNotNone(metadata)
