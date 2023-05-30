# import os
# from io import StringIO

# from boundary.models import Boundary, BoundaryDetails
# from django.conf import settings
# from django.core.management import call_command
# from django.core.management.base import CommandError
# from django.test import TestCase


# class UploadBoundaryTest(TestCase):
#     def call_command(self, *args, **kwargs) -> str:
#         out = StringIO()
#         call_command('upload_boundary', *args, stdout=out,
#                      stderr=StringIO(), **kwargs)
#         return out.getvalue()

#     def test_missing_data_directory(self):
#         self.assertRaises(CommandError, self.call_command)

#     def test_force(self):
#         directory = os.path.join(settings.BASE_DIR, 'testing/testdata/')
#         configuration_file = os.path.join(
#             settings.BASE_DIR, 'testing/testdata/boundary.json')
#         self.call_command(
#             directory, '--configuration_file', configuration_file, '--force')
#         self.assertEqual(Boundary.objects.count(), 1)
#         self.assertEqual(BoundaryDetails.objects.count(), 1)

#     def test_no_force(self):
#         directory = os.path.join(settings.BASE_DIR, 'testing/testdata/')
#         configuration_file = os.path.join(
#             settings.BASE_DIR, 'testing/testdata/boundary.json')
#         self.call_command(
#             directory, '--configuration_file', configuration_file, '--force')
#         out = self.call_command(
#             directory, '--configuration_file', configuration_file, '--no-force')
#         self.assertIn(
#             'Exiting; use --force to overwrite the existing boundary.', out)
#         self.assertEqual(Boundary.objects.count(), 1)
#         self.assertEqual(BoundaryDetails.objects.count(), 1)

#     def test_no_matching_boundary(self):
#         directory = os.path.join(settings.BASE_DIR, 'testing/testdata/')
#         configuration_file = os.path.join(
#             settings.BASE_DIR, 'testing/testdata/boundary.json')
#         out = self.call_command(
#             directory, '--configuration_file', configuration_file, '--boundary', 'foo')
#         self.assertEqual(Boundary.objects.count(), 0)
#         self.assertEqual(BoundaryDetails.objects.count(), 0)
#         self.assertIn(
#             'Warning: no boundaries updated; check the --boundary argument.', out)

#     def test_matching_boundary(self):
#         directory = os.path.join(settings.BASE_DIR, 'testing/testdata/')
#         configuration_file = os.path.join(
#             settings.BASE_DIR, 'testing/testdata/boundary.json')
#         self.call_command(
#             directory, '--configuration_file', configuration_file, '--boundary', 'california')
#         self.assertEqual(Boundary.objects.count(), 1)
#         self.assertEqual(BoundaryDetails.objects.count(), 1)
