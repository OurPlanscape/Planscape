from django.test import SimpleTestCase

from stands.calculator import calculate_delta


class CalculateDeltaTest(SimpleTestCase):
    def test_calculate_delta(self):
        values_bases_expected_results = [
            (None, None, None),
            (1, None, 0),
            (0, 1, 0),
            (1, 0, 0),
            (1, 1, 0),
            (2, 1, 1),
            (1.5, 1, 0.5),
            (40, 20, 1),
        ]

        for value, base, expected_result in values_bases_expected_results:
            self.assertEqual(
                calculate_delta(value=value, baseline=base), expected_result
            )
