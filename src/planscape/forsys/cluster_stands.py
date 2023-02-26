
import numpy as np

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.image import grid_to_graph


def _normalize_priority_weights(
        priority_weights: dict[str, float]) -> dict[str, float]:
    if len(priority_weights.keys()) == 0:
        raise Exception("no priorities were found")
    denominator = 0
    for p in priority_weights.keys():
        denominator = denominator + np.square(priority_weights[p])
    denominator = np.sqrt(denominator)
    for p in priority_weights.keys():
        priority_weights[p] = priority_weights[p] / denominator
    return priority_weights


def _get_mask_and_features(
        pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
        pixel_width: int, pixel_height: int, priority_weights: dict[str, float],
        pixel_index_weight: float
) -> tuple[list[list[bool]], list[list[float]]]:
    mask = np.full((pixel_width, pixel_height), False)
    features = []
    for x in range(pixel_width):
        if x not in pixel_dist_to_condition_values.keys():
            for y in range(pixel_height):
                features.append([0, 0, 0])
            continue
        for y in range(pixel_height):
            if y not in pixel_dist_to_condition_values[x].keys():
                features.append([0, 0, 0])
                continue
            features.append(
                [pixel_index_weight * x,
                 pixel_index_weight * y,
                 _compute_weighted_priority(
                     pixel_dist_to_condition_values[x][y],
                     priority_weights)])
            mask[x][y] = True
    return mask, features


def _compute_weighted_priority(
        condition_values: dict[str, float],
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


def _get_cluster_pixels(cluster_labels: list[int],
                        mask: list[list[bool]],
                        pixel_width: int, pixel_height: int
                        ) -> dict[int, list[tuple[int, int]]]:
    if len(cluster_labels) != pixel_width * pixel_height:
        raise Exception("expected pixel_width * pixel_height cluster labels; " +
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



def cluster_stands(
        pixel_dist_to_condition_values: dict[int, dict[int, dict[str, float]]],
        pixel_width: int, pixel_height: int, priority_weights: dict[str, float],
        pixel_index_weight: float, num_clusters: int
) -> dict[int, list[tuple[int, int]]]:
    priority_weights = _normalize_priority_weights(priority_weights)
    mask, features = _get_mask_and_features(
        pixel_dist_to_condition_values, pixel_width, pixel_height,
        priority_weights, pixel_index_weight)
    connectivity = grid_to_graph(pixel_width, pixel_height, mask=mask)
    ward = AgglomerativeClustering(
        n_clusters=num_clusters, linkage='ward', connectivity=connectivity
    ).fit(np.array(features))
    return _get_cluster_pixels(ward.labels_, mask, pixel_width, pixel_height)
