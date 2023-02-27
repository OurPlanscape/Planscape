
import numpy as np

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.image import grid_to_graph
from scipy.sparse.csgraph import connected_components


# This compresses stand data by clustering adjacent stands according to a
# similarity metric.
# Assumptions:
#   - stands are arranged as pixels in an image
#   - although it's ok for the image to be missing pixels, all stands must be
#     part of a single connected component (this is a hard limitation of
#     AgglomerativeClustering)
#
# Inputs include ...
#   ... pixel_dist_to_condition_values: a dictionary mapping x-index to y-index
#           to conditions to scores
#   ... pixel_width: image width
#   ... pixel_height: image height
#   ... priority_condition_max_value: condition scores fall within range,
#           [0, priority_condition_max_value]
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
#   normalized_priority_weights ⋅ normalized_priority_conditions
# ]
#
# Normalization is applied to force ...
#   ... the l2 norm of normalized priority_conditions to 1
#   ... the l2 norm of normalized priority_weights to a value within the range,
#       [0, 1]
# Normalization enables clustering behavior to remain somewhat consistent for a
#   given pixel_index_weight regardless of priority weight values,
#   priority condition values, and the number of priority conditions.
#
# The output maps cluster ID's to stand index tuples, (x-index, y-index).
class ClusteredStands():
    # -------
    # outputs
    # -------
    # map of cluster ID's to stand index tuples.
    clusters_to_stands: dict[int, tuple[int, int]]
    # string message - set to None if clustering was successful.
    cluster_status_message: str | None

    # ----------------------
    # intermediate variables
    # ----------------------
    # normalized priority condition scores.
    _normalized_pixel_dist_to_condition_values: dict[int,
                                                     dict[int,
                                                          dict[str, float]]]
    # priority weights l2-normalized to a unit vector.
    _normalized_priority_weights: dict[str, float]

    # NxM matrix denoting whether a pixel is included as a stand.
    _mask: list[list[bool]]
    # feature vector used to compute the similarity of adjacent stands.
    _features: list[list[float]]
    # list of edges in a pixel connectivity graph.
    _connectivity: list[list[tuple[int, int], int]]

    def __init__(
            self,
            pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
            pixel_width: int, pixel_height: int,
            priority_condition_max_value: float,
            priority_weights: dict[str, float],
            pixel_index_weight: float, num_clusters: int):
        self._validate_input_params(
            pixel_dist_to_condition_values, pixel_width, pixel_height,
            priority_condition_max_value, priority_weights,
            pixel_index_weight, num_clusters)

        self.clusters_to_stands = None
        self.cluster_status_message = None

        self._mask = self._get_mask(
            pixel_dist_to_condition_values, pixel_width, pixel_height)
        if np.sum(self._mask) <= num_clusters:
            self.cluster_status_message = "num desired clusters gte num stands"
            return

        self._connectivity = grid_to_graph(
            pixel_width, pixel_height, mask=self._mask)
        num_connected_components = connected_components(self._connectivity)[0]
        if num_connected_components > num_clusters:
            raise Exception(
                "the graph has %d connected components -" %
                (num_connected_components) +
                " it's impossible to convert this into %d clusters" %
                (num_clusters))

        self._normalized_pixel_dist_to_condition_values = \
            self._normalize_condition_values(
                pixel_dist_to_condition_values, priority_condition_max_value)
        self._normalized_priority_weights = self._normalize_priority_weights(
            priority_weights)

        self._features = self._get_features(
            self._normalized_pixel_dist_to_condition_values, pixel_width,
            pixel_height, self._normalized_priority_weights, pixel_index_weight)

        ward = AgglomerativeClustering(
            n_clusters=num_clusters, linkage='ward',
            connectivity=self._connectivity).fit(
            np.array(self._features))

        self.clusters_to_stands = self._get_cluster_pixels(
            ward.labels_, self._mask, pixel_width, pixel_height)

    def _validate_input_params(
            self,
            pixel_dist_to_condition_values: dict[int,
                                                 dict[int, dict[str, float]]],
            pixel_width: int, pixel_height: int,
            priority_condition_max_value: float,
            priority_weights: dict[str, float],
            pixel_index_weight: float, num_clusters: int) -> None:
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
        for x in pixel_dist_to_condition_values.keys():
            for y in pixel_dist_to_condition_values[x].keys():
                conditions = pixel_dist_to_condition_values[x][y].keys()
                if len(priorities) != len(conditions):
                    raise Exception(
                        "expected len(priorities) == len(conditions)")
                for p in priorities:
                    if p not in conditions:
                        raise Exception(
                            "expected conditions to include priority, %s" %
                            (p))
                    if pixel_dist_to_condition_values[x][y][p] < 0 or pixel_dist_to_condition_values[x][y][p] > priority_condition_max_value:
                        raise Exception("expected condition score to be within range, [0, %f]" % (
                            priority_condition_max_value))

    def _normalize_condition_values(
            self,
            pixel_dist_to_condition_values: dict[int,
                                                 dict[int, dict[str, float]]],
        priority_condition_max_value: float
    ) -> dict[int, dict[int, dict[str, float]]]:
        normalized_pixel_dist_to_condition_values = {}
        for x in pixel_dist_to_condition_values.keys():
            if x not in normalized_pixel_dist_to_condition_values.keys():
                normalized_pixel_dist_to_condition_values[x] = {}
            for y in pixel_dist_to_condition_values[x].keys():
                if y not in normalized_pixel_dist_to_condition_values[x].keys():
                    normalized_pixel_dist_to_condition_values[x][y] = {}
                conditions = pixel_dist_to_condition_values[x][y]
                # Division by priority_condition_max_value forces individual
                # condition values to be within range, [0, 1].
                # A subsequent division by sqrt(len(conditions)) forces the l2 norm of the condition vector to be within range, [0, 1].
                denom = priority_condition_max_value * \
                    np.sqrt(len(conditions.keys()))
                for c in conditions.keys():
                    normalized_pixel_dist_to_condition_values[x][y][c] = conditions[c] / denom
        return normalized_pixel_dist_to_condition_values

    def _normalize_priority_weights(self,
                                    priority_weights: dict[str, float]
                                    ) -> dict[str, float]:
        # The denominator is the l2 norm of the priority weights vector.
        denom = 0
        for p in priority_weights.keys():
            denom = denom + np.square(priority_weights[p])
        denom = np.sqrt(denom)

        normalized_priority_weights = {}
        for p in priority_weights.keys():
            # Division by the l2 norm forces the l2 norm of the priority
            # weights veector to be 1.
            normalized_priority_weights[p] = priority_weights[p] / denom
        return normalized_priority_weights

    def _get_mask(
        self, pixel_dist_to_condition_values: dict[int,
                                                   dict[int,
                                                        dict[str, float]]],
            pixel_width: int, pixel_height: int) -> list[list[bool]]:
        mask = np.full((pixel_width, pixel_height), False)
        for x in range(pixel_width):
            if x not in pixel_dist_to_condition_values.keys():
                continue
            for y in range(pixel_height):
                if y not in pixel_dist_to_condition_values[x].keys():
                    continue
                mask[x][y] = True
        return mask

    def _get_features(self,
                      pixel_dist_to_condition_values:
                      dict[int, dict[int, dict[str, float]]],
                      pixel_width: int, pixel_height: int,
                      priority_weights: dict[str, float],
                      pixel_index_weight: float) -> list[list[float]]:
        features = []
        for x in range(pixel_width):
            if x not in pixel_dist_to_condition_values.keys():
                continue
            for y in range(pixel_height):
                if y not in pixel_dist_to_condition_values[x].keys():
                    continue
                features.append(
                    [pixel_index_weight * x,
                     pixel_index_weight * y,
                     self._compute_weighted_priority(
                         pixel_dist_to_condition_values[x][y],
                         priority_weights)])
        return features

    def _compute_weighted_priority(
            self, condition_values: dict[str, float],
            priority_weights: dict[str, float]) -> float:
        weighted_priority = 0
        for p in condition_values.keys():
            weighted_priority = weighted_priority + \
                priority_weights[p] * condition_values[p]
        return weighted_priority

    def _get_cluster_pixels(self, cluster_labels: list[int],
                            mask: list[list[bool]],
                            pixel_width: int, pixel_height: int
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
