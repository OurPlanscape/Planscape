
import numpy as np

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.image import grid_to_graph


class ClusteredStands():
    # output: map of cluster ID's to stand index tuples
    clusters_to_stands: dict[int, tuple[int, int]]

    # ----------------------
    # intermediate variables
    # ----------------------
    # Note: normalization forces the max weighted_priority_score difference
    # between two stands to a unit vector. This, in theory, will make
    # pixel_index_weight behave more consistently between forsys runs.

    # normalized priority condition scores
    # for N priority condition scores, scores are scaled to be within range
    # [0, 1/sqrt(N)]
    _normalized_pixel_dist_to_condition_values: dict[int,
                                                     dict[int,
                                                          dict[str, float]]]
    # priority weights l2-normalized to a unit vector.
    _normalized_priority_weights: dict[str, float]

    # NxM matrix denoting whether a pixel is included as a stand.
    _mask: list[list[bool]]
    # feature vector consisting of weighted stand indices and a weighted
    # priority score - i.e.
    # [
    #   pixel_index_weight * x,
    #   pixel_index_weight * y
    #   normalized_priority_weights ⋅ normalized_priority_conditions
    # ])
    _features: list[list[float]]
    # list of edges in a pixel connectivity graph, output of grid_to_graph
    _connectivity: list[list[tuple[int, int], int]]

    def __init__(
            self,
            pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
            pixel_width: int, pixel_height: int,
            priority_condition_max_value: float,
            priority_weights: dict[str, float],
            pixel_index_weight: float, num_clusters: int):
        
        self._normalized_pixel_dist_to_condition_values = self._normalize_condition_values(
            pixel_dist_to_condition_values, priority_condition_max_value)
        self._normalized_priority_weights = self._normalize_priority_weights(
            priority_weights)
        
        self._mask, self._features = self._get_mask_and_features(
            pixel_dist_to_condition_values, pixel_width, pixel_height,
            priority_weights, pixel_index_weight)
        self._connectivity = grid_to_graph(
            pixel_width, pixel_height, mask=self._mask)
        
        ward = AgglomerativeClustering(
            n_clusters=num_clusters, linkage='ward',
            connectivity=self._connectivity).fit(
            np.array(self._features))

        self.clusters_to_stands = self._get_cluster_pixels(
            ward.labels_, self._mask, pixel_width, pixel_height)

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
                denom = priority_condition_max_value * \
                    np.sqrt(len(conditions.keys()))
                for c in conditions.keys():
                    normalized_pixel_dist_to_condition_values[x][y][c] = conditions[c] / denom
        return normalized_pixel_dist_to_condition_values

    def _normalize_priority_weights(self,
                                    priority_weights: dict[str, float]
                                    ) -> dict[str, float]:
        if len(priority_weights.keys()) == 0:
            raise Exception("no priorities were found")
        denominator = 0
        for p in priority_weights.keys():
            denominator = denominator + np.square(priority_weights[p])
        denominator = np.sqrt(denominator)
        for p in priority_weights.keys():
            priority_weights[p] = priority_weights[p] / denominator
        return priority_weights

    def _get_mask_and_features(self,
                               pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
                               pixel_width: int, pixel_height: int, priority_weights: dict[str, float],
                               pixel_index_weight: float
                               ) -> tuple[list[list[bool]], list[list[float]]]:
        mask = np.full((pixel_width, pixel_height), False)
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
                mask[x][y] = True
        return mask, features

    def _compute_weighted_priority(
            self, condition_values: dict[str, float],
            priority_weights: dict[str, float]) -> float:
        if len(condition_values.keys()) == 0:
            raise Exception("no conditions were found")
        if len(condition_values.keys()) != len(priority_weights.keys()):
            raise Exception(
                "expected len(conditions) to be equal to " +
                "len(priority_weights); instead, there were %d " %
                (len(condition_values.keys())) + " conditions and %d " %
                (len(priority_weights.keys())) + " priority weights")
        weighted_priority = 0
        for p in condition_values.keys():
            if p not in priority_weights.keys():
                raise Exception("condition missing priority weight")
            weighted_priority = weighted_priority + \
                priority_weights[p] * condition_values[p]
        return weighted_priority

    def _get_cluster_pixels(self, cluster_labels: list[int],
                            mask: list[list[bool]],
                            pixel_width: int, pixel_height: int
                            ) -> dict[int, list[tuple[int, int]]]:
        if len(cluster_labels) != np.sum(mask):
            raise Exception(
                "expected %d cluster labels; " % (np.sum(mask)) +
                "instead, %d were provided" % (len(cluster_labels)))
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
