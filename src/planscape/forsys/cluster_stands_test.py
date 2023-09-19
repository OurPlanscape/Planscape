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
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}

        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=3,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=5,
        )
        # 6 stands are reduced to 5 clusters.
        # (0, 1) and (1, 1) are clustered because they are adjacent and have
        # the same value.
        self.assertDictEqual(
            clustered_stands.clusters_to_stands,
            {0: [(0, 1), (1, 1)], 1: [(2, 0)], 2: [(2, 1)], 3: [(1, 0)], 4: [(0, 0)]},
        )

    def test_clusters_adjacent_pixels(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.5}},
        }
        priority_weights = {"foo": 10}
        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=3,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=4,
        )

        # 6 stands are reduced to 4 clusters.
        # Even though (0, 0) and (2, 1) have the same value, they aren't
        # clustered because they aren't adjacent to each other. Instead, (0, 0)
        # and (1, 0) are clustered.
        self.assertDictEqual(
            clustered_stands.clusters_to_stands,
            {0: [(0, 0), (1, 0)], 1: [(0, 1), (1, 1)], 2: [(2, 1)], 3: [(2, 0)]},
        )

    def test_clusters_pixels_missing_values(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=3,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=4,
        )
        # 5 stands are reduced to 4 clusters.
        # (0, 0) and (1, 0) are clustered because they are adjacent and have
        # the smallest diff. The missing stand at (0, 1) doesn't impact the
        # outcome.
        self.assertDictEqual(
            clustered_stands.clusters_to_stands,
            {0: [(0, 0), (1, 0)], 1: [(2, 0)], 2: [(2, 1)], 3: [(1, 1)]},
        )

    # -------------------------------------------------------------------
    # The following tests demonstrate the impact of pixel_index_weight on
    # clustering.
    # -------------------------------------------------------------------

    def test_pixel_index_weight_prefers_blobs(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.45}},
            1: {0: {"foo": 0.5}, 1: {"foo": 0.45}},
            2: {0: {"foo": 0.5}, 1: {"foo": 0.1}},
            3: {0: {"foo": 0.5}, 1: {"foo": 0.1}},
        }
        priority_weights = {"foo": 10}

        # With pixel_index_weight=0, the largest cluster is a line.
        clustered_stands_piw0 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_piw0.clusters_to_stands,
            {
                0: [(0, 0), (1, 0), (2, 0), (3, 0)],
                1: [(2, 1), (3, 1)],
                2: [(0, 1), (1, 1)],
            },
        )

        # With pixel_index_weight=10, the largest cluster is a 2x2 square.
        clustered_stands_piw10 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=10,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_piw10.clusters_to_stands,
            {
                0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                1: [(2, 1), (3, 1)],
                2: [(2, 0), (3, 0)],
            },
        )

    def test_pixel_index_weight_prefers_smaller_clusters(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.5}},
            1: {0: {"foo": 0.5}, 1: {"foo": 0.5}},
            2: {0: {"foo": 0.5}, 1: {"foo": 0.5}},
            3: {0: {"foo": 0.5}, 1: {"foo": 0.4}},
        }
        priority_weights = {"foo": 10}

        # With pixel_index_weight=0, cluster sizes are unbalanced.
        clustered_stands_piw0 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=2,
        )
        self.assertDictEqual(
            clustered_stands_piw0.clusters_to_stands,
            {0: [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0), (2, 1), (3, 0)], 1: [(3, 1)]},
        )

        # With pixel_index_weight=10, cluster sizes are more balanced.
        clustered_stands_piw10 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=10,
            num_clusters=2,
        )
        self.assertDictEqual(
            clustered_stands_piw10.clusters_to_stands,
            {0: [(2, 0), (2, 1), (3, 0), (3, 1)], 1: [(0, 0), (0, 1), (1, 0), (1, 1)]},
        )

    # ----------------------------------------------------------------------
    # The following tests demonstrate how cluster features are normalized so
    # that solutions stay consistent regardless of scaling.
    # -----------------------------------------------------------------------

    def test_normalizes_priority_weights(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5, "bar": 0.3}, 1: {"foo": 0.4, "bar": 0.3}},
            1: {0: {"foo": 0.5, "bar": 0.3}, 1: {"foo": 0.4, "bar": 0.3}},
            2: {0: {"foo": 0.5, "bar": 0.3}, 1: {"foo": 0.1, "bar": 0.3}},
            3: {0: {"foo": 0.5, "bar": 0.3}, 1: {"foo": 0.1, "bar": 0.3}},
        }
        priority_weights = {"foo": 10, "bar": 5}

        # Baseline: preference for a blob over a line.
        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=1,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands.clusters_to_stands,
            {
                0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                1: [(2, 1), (3, 1)],
                2: [(2, 0), (3, 0)],
            },
        )

        # Scaling pixel_index_weight by a factor of 1/100: preference for a line
        # over a blob.
        clustered_stands_piw0p01 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=1e-2,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_piw0p01.clusters_to_stands,
            {
                0: [(0, 0), (1, 0), (2, 0), (3, 0)],
                1: [(2, 1), (3, 1)],
                2: [(0, 1), (1, 1)],
            },
        )

        # Scaling priority weights by a factor of 100: preference for a blob
        # over a line (no change from baseline).
        priority_weights_100x = {"foo": 1000, "bar": 500}
        clustered_stands_pw10 = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights_100x,
            pixel_index_weight=1,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_pw10.clusters_to_stands,
            {
                0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                1: [(2, 1), (3, 1)],
                2: [(2, 0), (3, 0)],
            },
        )

    def test_normalizes_num_condition_scores(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5, "bar": 0.5}, 1: {"foo": 0.4, "bar": 0.4}},
            1: {0: {"foo": 0.5, "bar": 0.5}, 1: {"foo": 0.4, "bar": 0.4}},
            2: {0: {"foo": 0.5, "bar": 0.5}, 1: {"foo": 0.1, "bar": 0.1}},
            3: {0: {"foo": 0.5, "bar": 0.5}, 1: {"foo": 0.1, "bar": 0.1}},
        }
        priority_weights = {"foo": 10, "bar": 5}

        # Baseline: preference for a blob over a line.
        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=7.5 * 1e-2,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands.clusters_to_stands,
            {
                0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                1: [(2, 1), (3, 1)],
                2: [(2, 0), (3, 0)],
            },
        )

        # Scaling pixel_index_weight by a factor of 1/1.5: preference for a line
        # over a blob.
        clustered_stands_piw = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=7.5 * 1e-2 / 1.5,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_piw.clusters_to_stands,
            {
                0: [(0, 0), (1, 0), (2, 0), (3, 0)],
                1: [(2, 1), (3, 1)],
                2: [(0, 1), (1, 1)],
            },
        )

        # Moving from 2 conditions to 3 conditions (i.e. scaling the condition
        # features by 1.5): preference for a blob over a line (no change from
        # baseline)
        pixel_dist_to_condition_values_c3 = {
            0: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.4, "bar": 0.4, "baz": 0.4},
            },
            1: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.4, "bar": 0.4, "baz": 0.4},
            },
            2: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.1, "bar": 0.1, "baz": 0.1},
            },
            3: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.1, "bar": 0.1, "baz": 0.1},
            },
        }
        priority_weights_c3 = {"foo": 10, "bar": 5, "baz": 7.5}
        clustered_stands_c3 = ClusteredStands(
            pixel_dist_to_condition_values_c3,
            pixel_width=4,
            pixel_height=2,
            priority_weights=priority_weights_c3,
            pixel_index_weight=1,
            num_clusters=3,
        )
        self.assertDictEqual(
            clustered_stands_c3.clusters_to_stands,
            {
                0: [(0, 0), (0, 1), (1, 0), (1, 1)],
                1: [(2, 1), (3, 1)],
                2: [(2, 0), (3, 0)],
            },
        )

    # ----------------------------------------------------
    # The following tests are for validating corner cases.
    # ----------------------------------------------------

    def test_handles_more_clusters_than_stands(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        clustered_stands = ClusteredStands(
            pixel_dist_to_condition_values,
            pixel_width=3,
            pixel_height=2,
            priority_weights=priority_weights,
            pixel_index_weight=0,
            num_clusters=10,
        )
        self.assertEqual(
            clustered_stands.cluster_status_message,
            "num desired clusters >= num stands",
        )

    def test_raises_connectivity_error(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=3,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=0,
                num_clusters=1,
            )
        self.assertEqual(
            str(context.exception),
            "It's impossible to cluster pixels into 1 clusters - due to missing condition values, the smallest possible number of clusters is 2",
        )

    # --------------------------------------------------------
    # The following tests are for validating input parameters.
    # --------------------------------------------------------

    def test_raises_error_bad_width(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=-1,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=0,
                num_clusters=5,
            )
        self.assertEqual(
            str(context.exception), "expected pixel_width to be a positive integer"
        )

    def test_raises_error_bad_height(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=3,
                pixel_height=0,
                priority_weights=priority_weights,
                pixel_index_weight=0,
                num_clusters=5,
            )
        self.assertEqual(
            str(context.exception), "expected pixel_height to be a positive integer"
        )

    def test_raises_error_bad_num_clusters(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=3,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=0,
                num_clusters=-0.2,
            )
        self.assertEqual(
            str(context.exception), "num_clusters must be a positive integer"
        )

    def test_raises_error_bad_pixel_index_weight(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {"foo": 10}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=3,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=-10,
                num_clusters=5,
            )
        self.assertEqual(str(context.exception), "pixel_index_weight must be gte 0")

    def test_raises_error_zero_priorities(self) -> None:
        pixel_dist_to_condition_values = {
            0: {0: {"foo": 0.5}, 1: {"foo": 0.2}},
            1: {0: {"foo": 0.45}, 1: {"foo": 0.2}},
            2: {0: {"foo": 0.3}, 1: {"foo": 0.6}},
        }
        priority_weights = {}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=4,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=1,
                num_clusters=3,
            )
        self.assertEqual(str(context.exception), "expected at least 1 priority weight")

    def test_raises_error_priority_condition_mismatch(self) -> None:
        pixel_dist_to_condition_values = {
            0: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.4, "bar": 0.4, "baz": 0.4},
            },
            1: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.4, "bar": 0.4, "baz": 0.4},
            },
            2: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.1, "bar": 0.1, "baz": 0.1},
            },
            3: {
                0: {"foo": 0.5, "bar": 0.5, "baz": 0.5},
                1: {"foo": 0.1, "bar": 0.1, "baz": 0.1},
            },
        }
        priority_weights = {"foo": 10, "baz": 7.5}
        with self.assertRaises(Exception) as context:
            ClusteredStands(
                pixel_dist_to_condition_values,
                pixel_width=4,
                pixel_height=2,
                priority_weights=priority_weights,
                pixel_index_weight=1,
                num_clusters=3,
            )
        self.assertEqual(
            str(context.exception), "expected len(priorities) == len(conditions)"
        )
