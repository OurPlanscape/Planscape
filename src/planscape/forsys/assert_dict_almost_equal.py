import numpy as np


# Validates that two dictionaries have values that are "almost equal".
# Must be called from a TestCase class.
# Mostly calls Django TestCase assertion checks, but for lists of floats, calls
# numpy.testing.assert_array_almost_equal instead since a similar check isn't
# available in Django.
# TODO: this covers many cases, but a better solution would be recursive to
# cover dictionaries within dictionaries (not implemented in the interest of
# time).
def assert_dict_almost_equal(self, d1: dict, d2: dict) -> None:
    self.assertEqual(len(d1.keys()), len(d2.keys()))
    for k in d1.keys():
        l1 = d1[k]
        if isinstance(l1, list):
            # Note: both assert_array_almost_equal and assertListEqual check
            # for element order - i.e. [1, 2] and [2, 1] are not equal even
            # though they contain the same values in different orders.
            if len(l1) > 0 and type(l1[0]) is float:
                # TestCase doesn't have an assertListAlmostEqual check -
                # resorting to numpy.
                np.testing.assert_array_almost_equal(l1, d2[k])
            else:
                self.assertListEqual(l1, d2[k])
        else:
            # TODO: split assertEqual into other cases to accommodate floats,
            # dictionaries, sets, etc.
            self.assertEqual(l1, d2[k])
