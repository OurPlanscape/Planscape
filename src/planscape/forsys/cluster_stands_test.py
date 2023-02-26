from django.test import TestCase
from forsys.cluster_stands import cluster_stands


class ClusterStandsTest(TestCase):
    # -----------------------------------------------------------------------
    # The following tests focus on hierarchical clustering given an adjacency
    # matrix. pixel_index_weight is set to 0, meaning stand position variance
    # isn't considered (so there is no preference for round clusters over
    # clusters made of long strands of adjacent stands).
    # ------------------------------------------------------------------------

    def test_clusters_pixels(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {'foo': 0.5},  1: {'foo': 0.2}},
            1: {0: {'foo': 0.45}, 1: {'foo': 0.2}},
            2: {0: {'foo': 0.3},  1: {'foo': 0.6}},
        }
        priority_weights = {
            'foo': 10
        }
        cluster_pixels = cluster_stands(pixel_dist_to_condition_values,
                                        3, 2, priority_weights, 0, 5)
        # 6 stands are reduced to 5 clusters.
        # (0, 1) and (1, 1) are clustered because they are adjacent and have
        # the same value.
        self.assertDictEqual(cluster_pixels,
                             {0: [(0, 1), (1, 1)],
                              1: [(2, 0)],
                              2: [(2, 1)],
                              3: [(1, 0)],
                              4: [(0, 0)]})

    def test_clusters_adjacent_pixels(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {'foo': 0.5},  1: {'foo': 0.2}},
            1: {0: {'foo': 0.45}, 1: {'foo': 0.2}},
            2: {0: {'foo': 0.3},  1: {'foo': 0.5}},
        }
        priority_weights = {
            'foo': 10
        }
        cluster_pixels = cluster_stands(pixel_dist_to_condition_values,
                                        3, 2, priority_weights, 0, 4)
        # 6 stands are reduced to 4 clusters.
        # Even though (0, 0) and (2, 1) have the same value, they aren't
        # clustered because they aren't adjacent to each other. Instead, (0, 0
        # and (1, 0) are clustered.
        self.assertDictEqual(cluster_pixels,
                             {0: [(0, 0), (1, 0)],
                              1: [(0, 1), (1, 1)],
                              2: [(2, 1)],
                              3: [(2, 0)]})
