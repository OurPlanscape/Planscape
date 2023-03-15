import numpy as np


# Validates that two dictionaries have values that are "almost equal".
# Must be called from a TestCase class.
def assert_dict_almost_equal(self,
                             d1: dict,
                             d2: dict) -> None:
    self.assertEqual(len(d1.keys()), len(d2.keys()))
    for k in d1.keys():
        l1 = d1[k]
        if isinstance(l1, list):
            if len(l1) > 0 and type(l1[0]) is float:
                np.testing.assert_array_almost_equal(l1, d2[k])
            else:
                self.assertListEqual(l1, d2[k])
        else:
            self.assertEqual(l1, d2[k])
