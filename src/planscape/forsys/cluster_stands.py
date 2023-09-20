import numpy as np

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.image import grid_to_graph
from scipy.sparse.csgraph import connected_components


# This compresses stand data by clustering adjacent stands according to a
# similarity metric.
# Assumptions:
#   - stands are arranged as pixels in an image
#   - although it's ok for the image to be missing pixels, the number of
#     connected components must be greater than the desired number of clusters
#   - condition scores share the same min and max value range
#
# Inputs include ...
#   ... x_to_y_to_condition_to_value: a dictionary mapping x-index to y-index
#           to conditions to scores
#   ... pixel_width: image width
#   ... pixel_height: image height
#   ... priority_weights: weights applied to condition scores before computing
#           a similarity metric
#   ... pixel_index_weight:
#           - weights applied to x-index and y-index values before computing a
#             similarity metric
#           - used to control cluster shape - a lower value gives preference to
#             long strands, a higher value gives preference to smaller circular
#             clusters
#   ... num_clusters: the target number of clusters
#
# The feature vector used to inform similarity is ...
# [
#   pixel_index_weight * x-index,
#   pixel_index_weight * y-index
#   normalized_priority_weights ⋅ priority_conditions
# ]
#
# Normalization is applied to force the l1 norm of priority_weights to 1.
# Normalization enables clustering behavior to remain somewhat consistent for a
#   given pixel_index_weight regardless of priority weight values and the
#   number of priority conditions.
#
# The output maps cluster ID's to stand index tuples, (x-index, y-index).
class ClusteredStands:
    # -------
    # outputs
    # -------
    # map of cluster ID's to stand index tuples.
    clusters_to_stands: dict[int, list[tuple[int, int]]]
    # string message - set to None if clustering was successful.
    cluster_status_message: str | None

    # ----------------------
    # intermediate variables
    # ----------------------
    # priority condition scores.
    # keys are 1) x-index, 2) y-index, 3) condition name.
    _x_to_y_to_condition_to_value: dict[int, dict[int, dict[str, float]]]
    # priority weights l1-normalized to a unit vector.
    # keyed by condition name.
    _normalized_priority_weights: dict[str, float]

    # WIDTH x HEIGHT matrix denoting whether a pixel is included as a stand.
    # indexed by x-index, y-index
    _mask: list[list[bool]]
    # feature vectors used to compute the similarity of adjacent stands.
    # feature vectors are listed for elements in the x,y tuple order,
    # (x1, y1), (x1, y2), ... (x1, yM), (x2, y1), (x2, y2), ..., (xN, yM)
    # x,y tuples missing features (aka mask[x][y] = False) are not included.
    _features: list[list[float]]
    # list of edges in a pixel connectivity graph.
    # each row contains an x,y tuple and 1 (for denoting edge weight)
    # edges with 0 weight are not included
    _connectivity: list[list[tuple[int, int], int]]

    def __init__(
        self,
        x_to_y_to_condition_to_value: dict[int, dict[int, dict[str, float]]],
        pixel_width: int,
        pixel_height: int,
        priority_weights: dict[str, float],
        pixel_index_weight: float,
        num_clusters: int,
    ):
        self._validate_input_params(
            x_to_y_to_condition_to_value,
            pixel_width,
            pixel_height,
            priority_weights,
            pixel_index_weight,
            num_clusters,
        )

        self.clusters_to_stands = None
        self.cluster_status_message = None

        self._mask = self._create_mask(
            x_to_y_to_condition_to_value, pixel_width, pixel_height
        )
        if np.sum(self._mask) <= num_clusters:
            self.cluster_status_message = "num desired clusters >= num stands"
            return

        self._connectivity = grid_to_graph(pixel_width, pixel_height, mask=self._mask)
        num_connected_components = connected_components(self._connectivity)[0]
        if num_connected_components > num_clusters:
            raise Exception(
                "It's impossible to cluster pixels into %d clusters - " % (num_clusters)
                + "due to missing condition values, the smallest possible "
                + "number of clusters is %d" % (num_connected_components)
            )

        self._x_to_y_to_condition_to_value = x_to_y_to_condition_to_value
        self._normalized_priority_weights = self._normalize_priority_weights(
            priority_weights
        )

        self._features = self._get_features(
            self._x_to_y_to_condition_to_value,
            self._mask,
            self._normalized_priority_weights,
            pixel_index_weight,
        )

        ward = AgglomerativeClustering(
            n_clusters=num_clusters, linkage="ward", connectivity=self._connectivity
        ).fit(np.array(self._features))

        self.clusters_to_stands = self._get_cluster_pixels(
            ward.labels_, self._mask, pixel_width, pixel_height
        )

    # Validates that input parameter values make sense.
    def _validate_input_params(
        self,
        x_to_y_to_condition_to_value: dict[int, dict[int, dict[str, float]]],
        pixel_width: int,
        pixel_height: int,
        priority_weights: dict[str, float],
        pixel_index_weight: float,
        num_clusters: int,
    ) -> None:
        if pixel_width <= 0 or type(pixel_height) != int:
            raise Exception("expected pixel_width to be a positive integer")
        if pixel_height <= 0 or type(pixel_height) != int:
            raise Exception("expected pixel_height to be a positive integer")
        if num_clusters < 1:
            raise Exception("num_clusters must be a positive integer")
        if pixel_index_weight < 0:
            raise Exception("pixel_index_weight must be gte 0")
        priorities = list(priority_weights.keys())
        if len(priorities) == 0:
            raise Exception("expected at least 1 priority weight")
        for x in x_to_y_to_condition_to_value.keys():
            for y in x_to_y_to_condition_to_value[x].keys():
                conditions = x_to_y_to_condition_to_value[x][y].keys()
                if len(priorities) != len(conditions):
                    raise Exception("expected len(priorities) == len(conditions)")
                for p in priorities:
                    if p not in conditions:
                        raise Exception(
                            "expected conditions to include priority, %s" % (p)
                        )

    # Normalizes priority weights so that the l1 norm of the vector is 1.
    def _normalize_priority_weights(
        self, priority_weights: dict[str, float]
    ) -> dict[str, float]:
        # The denominator is the l2 norm of the priority weights vector.
        denom = 0
        for p in priority_weights.keys():
            denom = denom + priority_weights[p]

        normalized_priority_weights = {}
        for p in priority_weights.keys():
            # Division by the l2 norm forces the l2 norm of the priority
            # weights vector to be 1.
            normalized_priority_weights[p] = priority_weights[p] / denom
        return normalized_priority_weights

    # Generates a list[list[bool]] matrix with dimensions, pixel_width,
    # pixel_height. Matrix elements are True if priority condition values are
    # available for the element, and False otherwise.
    def _create_mask(
        self,
        pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
        pixel_width: int,
        pixel_height: int,
    ) -> list[list[bool]]:
        mask = np.full((pixel_width, pixel_height), False)
        for x in range(pixel_width):
            if x not in pixel_dist_to_condition_values.keys():
                continue
            for y in range(pixel_height):
                if y not in pixel_dist_to_condition_values[x].keys():
                    continue
                mask[x][y] = True
        return mask

    # Retrieves a list of features for each element in the pixel_width x
    # pixel_height matrix.
    # Features are [
    #   pixel_index_weight * x-index,
    #   pixel_index_weight * y-index
    #   normalized_priority_weights ⋅ priority_conditions
    # ]
    # Elements are listed in the order,
    # (x1, y1), (x1, y2), ... (x1, yM), (x2, y1), (x2, y2), ..., (xN, yM)
    # Elements missing priority condition values (aka elements where
    # mask[x][y] = False) are omitted.
    def _get_features(
        self,
        pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
        mask: list[list[bool]],
        priority_weights: dict[str, float],
        pixel_index_weight: float,
    ) -> list[list[float]]:
        features = []
        for x in range(len(mask)):
            for y in range(len(mask[x])):
                if not mask[x][y]:
                    continue
                features.append(
                    [
                        pixel_index_weight * x,
                        pixel_index_weight * y,
                        self._compute_weighted_priority(
                            pixel_dist_to_condition_values[x][y], priority_weights
                        ),
                    ]
                )
        return features

    # Computes weighted priority as a dot-product between priority_weights and
    # condition_values.
    def _compute_weighted_priority(
        self, condition_values: dict[str, float], priority_weights: dict[str, float]
    ) -> float:
        weighted_priority = 0
        for p in condition_values.keys():
            weighted_priority = (
                weighted_priority + priority_weights[p] * condition_values[p]
            )
        return weighted_priority

    # Converts a list of cluster labels into a dictionary mapping cluster ID to
    # lists of merged image matrix index tuples.
    def _get_cluster_pixels(
        self,
        cluster_labels: list[int],
        mask: list[list[bool]],
        pixel_width: int,
        pixel_height: int,
    ) -> dict[int, list[tuple[int, int]]]:
        i = 0
        cluster_to_pixels = {}
        for x in range(pixel_width):
            for y in range(pixel_height):
                if mask[x][y]:
                    cluster = cluster_labels[i]
                    if cluster in cluster_to_pixels.keys():
                        cluster_to_pixels[cluster].append((x, y))
                    else:
                        cluster_to_pixels[cluster] = [(x, y)]
                    i = i + 1
        return cluster_to_pixels
