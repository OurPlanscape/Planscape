from django.test import TestCase
from forsys.cluster_stands import ClusteredStands


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
        clustered_stands = ClusteredStands(pixel_dist_to_condition_values,
                                           3, 2, 1, priority_weights, 0, 5)
        # 6 stands are reduced to 5 clusters.
        # (0, 1) and (1, 1) are clustered because they are adjacent and have
        # the same value.
        self.assertDictEqual(clustered_stands.clusters_to_stands,
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
        clustered_stands = ClusteredStands(pixel_dist_to_condition_values,
                                           3, 2, 1, priority_weights, 0, 4)
        # 6 stands are reduced to 4 clusters.
        # Even though (0, 0) and (2, 1) have the same value, they aren't
        # clustered because they aren't adjacent to each other. Instead, (0, 0
        # and (1, 0) are clustered.
        self.assertDictEqual(clustered_stands.clusters_to_stands,
                             {0: [(0, 0), (1, 0)],
                              1: [(0, 1), (1, 1)],
                              2: [(2, 1)],
                              3: [(2, 0)]})

    def test_clusters_pixels_missing_values(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {'foo': 0.5}},
            1: {0: {'foo': 0.45}, 1: {'foo': 0.2}},
            2: {0: {'foo': 0.3},  1: {'foo': 0.6}},
        }
        priority_weights = {
            'foo': 10
        }
        clustered_stands = ClusteredStands(pixel_dist_to_condition_values,
                                           3, 2, 1, priority_weights, 0, 4)
        # 5 stands are reduced to 4 clusters.
        # (0, 0) and (1, 0) are clustered because they are adjacent and have
        # the smallest diff. The missing stand at (0, 1) doesn't impact the
        # outcome.
        self.assertDictEqual(clustered_stands.clusters_to_stands,
                             {0: [(0, 0), (1, 0)],
                              1: [(2, 0)],
                              2: [(2, 1)],
                              3: [(1, 1)]})

    # -------------------------------------------------------------------
    # The following tests demonstrate the impact of pixel_index_weight on
    # clustering.
    # -------------------------------------------------------------------

    def test_pixel_index_weight_prefers_blobs(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {'foo': 0.5},  1: {'foo': 0.45}},
            1: {0: {'foo': 0.5}, 1: {'foo': 0.45}},
            2: {0: {'foo': 0.5},  1: {'foo': 0.1}},
            3: {0: {'foo': 0.5},  1: {'foo': 0.1}},
        }
        priority_weights = {
            'foo': 10
        }

        # With pixel_index_weight=0, the largest cluster is a line.
        clustered_stands_piw0 = ClusteredStands(
            pixel_dist_to_condition_values, 4, 2, 1, priority_weights, 0, 3)
        self.assertDictEqual(clustered_stands_piw0.clusters_to_stands,
                             {0: [(0, 0), (1, 0), (2, 0), (3, 0)],
                              1: [(2, 1), (3, 1)],
                              2: [(0, 1), (1, 1)]})

        # With pixel_index_weight=10, the largest cluster is a 2x2 square.
        clustered_stands_piw10 = ClusteredStands(
            pixel_dist_to_condition_values, 4, 2, 1, priority_weights, 10, 3)
        self.assertDictEqual(clustered_stands_piw10.clusters_to_stands,
                             {0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                              1: [(2, 1), (3, 1)],
                              2: [(2, 0), (3, 0)]})

    def test_pixel_index_weight_prefers_smaller_clusters(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {'foo': 0.5},  1: {'foo': 0.5}},
            1: {0: {'foo': 0.5}, 1: {'foo': 0.5}},
            2: {0: {'foo': 0.5},  1: {'foo': 0.5}},
            3: {0: {'foo': 0.5},  1: {'foo': 0.4}},
        }
        priority_weights = {
            'foo': 10
        }

        # With pixel_index_weight=0, cluster sizes are unbalanced.
        clustered_stands_piw0 = ClusteredStands(
            pixel_dist_to_condition_values, 4, 2, 1, priority_weights, 0, 2)
        self.assertDictEqual(clustered_stands_piw0.clusters_to_stands,
                             {0: [(0, 0), (0, 1), (1, 0), (1, 1),
                                  (2, 0), (2, 1), (3, 0)],
                              1: [(3, 1)]})

        # With pixel_index_weight=10, cluster sizes are more balanced.
        clustered_stands_piw10 = ClusteredStands(
            pixel_dist_to_condition_values, 4, 2, 1, priority_weights, 10, 2)
        self.assertDictEqual(clustered_stands_piw10.clusters_to_stands,
                             {0: [(2, 0), (2, 1), (3, 0), (3, 1)],
                              1: [(0, 0), (0, 1), (1, 0), (1, 1)]})

    # ----------------------------------------------------------------------
    # The following tests demonstrate how cluster features are normalized so
    # that solutions stay consistent regardless of how condition scores and
    # priority weights are scaled.
    # -----------------------------------------------------------------------