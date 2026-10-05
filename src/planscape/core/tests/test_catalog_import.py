import copy
import json

from django.apps import apps
from django.core import serializers
from django.core.management.base import CommandError
from django.db import IntegrityError
from django.test import TestCase, override_settings

from core.catalog_import import CatalogImporter
from datasets.models import Category, DataLayer, DataLayerHasStyle, Dataset
from datasets.tests.factories import DataLayerFactory, DatasetFactory, StyleFactory
from planning.models import TreatmentGoalUsesDataLayer
from planning.tests.factories import (
    TreatmentGoalFactory,
    TreatmentGoalUsesDataLayerFactory,
)
from planscape.tests.factories import UserFactory


@override_settings(DEFAULT_ADMIN_EMAIL="catalog-admin@example.com")
class CatalogImportTests(TestCase):
    def setUp(self):
        self.admin = UserFactory(email="catalog-admin@example.com")
        self.dataset = DatasetFactory(created_by=self.admin)
        self.root = Category.add_root(
            dataset=self.dataset,
            organization=self.dataset.organization,
            created_by=self.admin,
            name="Root",
            order=0,
        )
        self.child = self.root.add_child(
            dataset=self.dataset,
            organization=self.dataset.organization,
            created_by=self.admin,
            name="Child",
            order=0,
        )
        self.layer = DataLayerFactory(
            dataset=self.dataset,
            category=self.child,
            created_by=self.admin,
            name="Production layer",
            type="RASTER",
            storage_type="FILE_SYSTEM",
            url="gs://planscape-datastore-production/datalayers/source.tif",
        )
        self.style = StyleFactory(
            organization=self.dataset.organization, created_by=self.admin
        )
        self.link = DataLayerHasStyle.objects.create(
            datalayer=self.layer, style=self.style
        )
        self.goal = TreatmentGoalFactory(created_by=self.admin)
        self.usage = TreatmentGoalUsesDataLayerFactory(
            treatment_goal=self.goal, datalayer=self.layer
        )
        objects = [
            self.dataset.organization,
            self.dataset,
            self.root,
            self.child,
            self.layer,
            self.style,
            self.link,
            self.goal.category,
            self.goal,
            self.usage,
        ]
        self.fixture = json.loads(serializers.serialize("json", objects))
        # Every source ID differs, including creators which are not in the backup.
        for row in self.fixture:
            row["pk"] += 10000
            model = apps.get_model(row["model"])
            for field in model._meta.fields:
                if field.is_relation and row["fields"][field.name] is not None:
                    row["fields"][field.name] += 10000

    def row(self, label, index=0):
        return [row for row in self.fixture if row["model"] == label][index]

    def importer(self):
        return CatalogImporter(self.fixture, "production", "dev")

    def test_updates_by_identity_and_second_import_is_unchanged(self):
        self.row("datasets.datalayer")["fields"]["metadata"] = {"new": True}
        result = self.importer().merge()
        self.layer.refresh_from_db()
        self.assertEqual(self.layer.metadata, {"new": True})
        self.assertEqual(self.layer.created_by_id, self.admin.pk)
        self.assertIn("planscape-datastore-dev", self.layer.url)
        self.assertEqual(result.id_map[DataLayer][self.layer.pk + 10000], self.layer.pk)
        second = self.importer().merge()
        self.assertTrue(
            all(
                counts["created"] == counts["updated"] == 0
                for counts in second.counts.values()
            )
        )

    def test_source_id_collision_preserves_local_layer_and_remaps_links(self):
        local = DataLayerFactory(
            dataset=self.dataset, name="Local test layer", type="RASTER"
        )
        row = self.row("datasets.datalayer")
        old_source_pk = row["pk"]
        row["pk"] = local.pk
        row["fields"]["name"] = "New production layer"
        for label in (
            "datasets.datalayerhasstyle",
            "planning.treatmentgoalusesdatalayer",
        ):
            self.row(label)["fields"]["datalayer"] = local.pk
        result = self.importer().merge()
        imported = DataLayer.objects.get(pk=result.id_map[DataLayer][local.pk])
        self.assertNotEqual(imported.pk, local.pk)
        local.refresh_from_db()
        self.assertEqual(local.name, "Local test layer")
        self.assertTrue(
            DataLayerHasStyle.objects.filter(
                datalayer=imported, style=self.style
            ).exists()
        )
        self.assertTrue(
            TreatmentGoalUsesDataLayer.objects.filter(
                datalayer=imported, treatment_goal=self.goal
            ).exists()
        )
        self.assertNotIn(old_source_pk, result.id_map[DataLayer])

    def test_local_links_survive_and_production_links_update(self):
        local_style = StyleFactory()
        extra = DataLayerHasStyle.objects.create(
            datalayer=self.layer, style=local_style
        )
        self.row("datasets.datalayerhasstyle")["fields"]["default"] = False
        self.row("planning.treatmentgoalusesdatalayer")["fields"]["weight"] = 10
        self.importer().merge()
        self.link.refresh_from_db()
        self.usage.refresh_from_db()
        self.assertFalse(self.link.default)
        self.assertEqual(self.usage.weight, 10)
        self.assertTrue(DataLayerHasStyle.objects.filter(pk=extra.pk).exists())

    def test_category_paths_are_destination_owned(self):
        self.row("datasets.dataset")["fields"]["name"] = "Another dataset"
        self.importer().merge()
        dataset = Dataset.objects.get(name="Another dataset")
        root = Category.objects.get(dataset=dataset, name="Root")
        child = Category.objects.get(dataset=dataset, name="Child")
        self.assertNotEqual(root.path, self.root.path)
        self.assertEqual(child.get_parent(), root)
        self.assertEqual(Category.find_problems(), ([], [], [], [], []))

    def test_category_order_updates_without_corrupting_tree(self):
        self.root.add_child(
            dataset=self.dataset, created_by=self.admin, name="Sibling", order=1
        )
        self.row("datasets.category", 1)["fields"]["order"] = 2
        self.importer().merge()
        self.assertEqual(
            list(self.root.get_children().values_list("name", flat=True)),
            ["Sibling", "Child"],
        )
        self.assertEqual(Category.find_problems(), ([], [], [], [], []))

    def test_soft_deleted_match_is_restored(self):
        self.layer.delete()
        self.importer().merge()
        self.layer.refresh_from_db()
        self.assertIsNone(self.layer.deleted_at)

    def test_validation_rejects_bad_fixtures_before_mutation(self):
        original = copy.deepcopy(self.fixture)
        invalid = [
            lambda: self.fixture.append(copy.deepcopy(self.row("datasets.dataset"))),
            lambda: self.row("datasets.datalayer")["fields"].update(workspace=999),
            lambda: self.row("datasets.datalayer")["fields"].update(dataset=999),
            lambda: self.row("datasets.category", 1)["fields"].update(path="99990001"),
            lambda: self.row("datasets.category", 1)["fields"].update(depth=99),
            lambda: self.fixture.append({"model": "users.user", "pk": 1, "fields": {}}),
        ]
        for mutate in invalid:
            with self.subTest(mutate=mutate):
                self.fixture = copy.deepcopy(original)
                mutate()
                with self.assertRaises(CommandError):
                    self.importer()
                self.assertEqual(DataLayer.objects.count(), 1)

    def test_duplicate_business_identity_and_ambiguous_destination_fail(self):
        duplicate = copy.deepcopy(self.row("datasets.dataset"))
        duplicate["pk"] += 1
        self.fixture.append(duplicate)
        with self.assertRaisesRegex(CommandError, "Duplicate source identity"):
            self.importer()
        self.fixture.pop()
        DatasetFactory(name=self.dataset.name, organization=self.dataset.organization)
        with self.assertRaisesRegex(CommandError, "Ambiguous destination"):
            self.importer()

    def test_merge_rolls_back_on_late_database_failure(self):
        self.row("datasets.dataset")["fields"]["description"] = "Changed"
        importer = self.importer()
        # Simulate a database failure after earlier updates.
        next(iter(importer.rows[TreatmentGoalUsesDataLayer].values()))["weight"] = -1
        with self.assertRaises(IntegrityError):
            importer.merge()
        self.dataset.refresh_from_db()
        self.assertNotEqual(self.dataset.description, "Changed")

    def test_vectors_rebuild_only_when_needed(self):
        self.row("datasets.datalayer")["fields"].update(
            type="VECTOR", table="prod.source"
        )
        self.layer.type = "VECTOR"
        self.layer.table = "dev.existing"
        self.layer.url = self.layer.url.replace("production", "dev")
        self.layer.save()
        self.assertEqual(self.importer().merge().vector_ids, [])
        self.layer.refresh_from_db()
        self.assertEqual(self.layer.table, "dev.existing")
        self.row("datasets.datalayer")["fields"]["hash"] = "new-hash"
        result = self.importer().merge()
        self.assertEqual(result.vector_ids, [self.layer.pk])
        self.layer.refresh_from_db()
        self.assertIsNone(self.layer.table)

    def test_equal_names_in_other_contexts_do_not_match(self):
        other_dataset = DatasetFactory(organization=self.dataset.organization)
        other_layer = DataLayerFactory(
            dataset=other_dataset, name=self.layer.name, type=self.layer.type
        )
        other_type = DataLayerFactory(
            dataset=self.dataset, name=self.layer.name, type="VECTOR"
        )
        other_style = StyleFactory(name=self.style.name, type=self.style.type)
        branch = self.root.add_child(
            dataset=self.dataset, created_by=self.admin, name="Other branch"
        )
        other_child = branch.add_child(
            dataset=self.dataset, created_by=self.admin, name=self.child.name
        )
        result = self.importer().merge()
        self.assertEqual(result.id_map[DataLayer][self.layer.pk + 10000], self.layer.pk)
        for obj in (other_layer, other_type, other_style, other_child):
            obj.refresh_from_db()
        self.assertEqual(result.id_map[Category][self.child.pk + 10000], self.child.pk)

    def test_stand_metrics_and_existing_creation_times_survive(self):
        from stands.models import StandMetric
        from stands.tests.factories import StandMetricFactory

        metric = StandMetricFactory(datalayer=self.layer)
        created_at = self.layer.created_at
        self.row("datasets.datalayer")["fields"]["metadata"] = {"changed": True}
        self.importer().merge()
        self.layer.refresh_from_db()
        self.assertEqual(self.layer.created_at, created_at)
        self.assertTrue(
            StandMetric.objects.filter(pk=metric.pk, datalayer=self.layer).exists()
        )

    def test_geometry_round_trip_is_unchanged(self):
        from django.contrib.gis.geos import Polygon

        geometry = Polygon(((0, 0), (1, 0), (1, 1), (0, 0)), srid=4326)
        self.layer.geometry = geometry
        self.layer.save()
        self.row("datasets.datalayer")["fields"]["geometry"] = geometry.ewkt
        self.importer().merge()
        result = self.importer().merge()
        self.assertEqual(result.counts["datasets.datalayer"]["unchanged"], 1)

    def test_missing_admin_fails_preflight(self):
        with override_settings(DEFAULT_ADMIN_EMAIL="missing@example.com"):
            with self.assertRaisesRegex(CommandError, "DEFAULT_ADMIN_EMAIL"):
                self.importer()

    def test_changed_pending_vector_clears_table_without_scheduling(self):
        self.layer.type = "VECTOR"
        self.layer.table = "dev.existing"
        self.layer.save()
        self.row("datasets.datalayer")["fields"].update(
            type="VECTOR", status="PENDING", hash="changed"
        )
        self.assertEqual(self.importer().merge().vector_ids, [])
        self.layer.refresh_from_db()
        self.assertIsNone(self.layer.table)

    def test_destination_workspace_record_does_not_match_global_catalog(self):
        from workspaces.tests.factories import WorkspaceFactory

        self.dataset.workspace = WorkspaceFactory()
        self.dataset.save()
        result = self.importer().merge()
        imported_pk = result.id_map[Dataset][self.dataset.pk + 10000]
        self.assertNotEqual(imported_pk, self.dataset.pk)
        self.dataset.refresh_from_db()
        self.assertIsNotNone(self.dataset.workspace_id)
        self.layer.refresh_from_db()
        self.assertEqual(self.layer.dataset_id, self.dataset.pk)

    def test_command_merges_real_fixture_and_dispatches_destination_id_after_commit(
        self,
    ):
        import tempfile
        from pathlib import Path
        from unittest import mock
        from django.core.management import call_command
        from core.models import RestoreBackTrack, RestoreBackTrackStatus

        self.row("datasets.datalayer")["fields"].update(
            type="VECTOR", table="prod.source"
        )
        local = DataLayerFactory(
            dataset=self.dataset, name="Local vector", type="VECTOR"
        )
        RestoreBackTrack.objects.all().delete()
        with tempfile.TemporaryDirectory() as backups:
            path = Path(backups) / "latest_production_backup.json"
            path.write_text(json.dumps(self.fixture))
            with override_settings(
                ENV="dev",
                BACKUPS_PATH=backups,
                STORAGE_SERVICE_ACCOUNT="test@example.com",
            ), mock.patch(
                "core.management.commands.load_backup_data.subprocess.run"
            ), mock.patch(
                "core.management.commands.load_backup_data.post_to_mattermost"
            ), mock.patch(
                "core.management.commands.load_backup_data.datalayer_uploaded.delay"
            ) as delay:
                with self.captureOnCommitCallbacks(execute=True):
                    call_command("load_backup_data", force=True)
                    delay.assert_not_called()
                imported = DataLayer.objects.get(
                    dataset=self.dataset, name=self.layer.name, type="VECTOR"
                )
                self.assertNotEqual(imported.pk, self.row("datasets.datalayer")["pk"])
                delay.assert_called_once_with(imported.pk)
                self.assertTrue(DataLayer.objects.filter(pk=local.pk).exists())
                self.assertEqual(
                    RestoreBackTrack.objects.get().status,
                    RestoreBackTrackStatus.SUCCESS,
                )
