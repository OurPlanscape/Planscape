suppressMessages({
    library(cluster)
    library(purrr)
    library(sf)
    library(tibble)
})

normalize_values <- function(x) {
  (x - min(x)) / (max(x) - min(x))
}

#' Generates k-means clusters using lat, lon, and project defined priorities.
#'
#' Arguments:
#' - stand_data: An sf_data_frame with a "geometry" and the fields named by
#'   other arguments to the function. Assumed to be complete cases only!
#' - stand_id_field: string, name of the column containing stand ids.
#' - stand_area_field: string, name of the column containing area values.
#' - stand_cost_field: string, name of the column containing cost values.
#' - scenario_priorities: vector of strings, names of the columns specifying
#'   the priorities that this scenario is aiming to optimize.
#' - geo_weight: real, a constant that specifies how much emphasis to place on
#'   the geospatial component of the data when performing the clustering.
#' - avg_cells_per_cluster: real, a constant specifying the average cluster
#'   size in the clustered output.
#' - seed: integer, controls random state initialisation.
kmeans_cluster_cells_to_stands <- function(
    stand_data,
    stand_id_field,
    stand_area_field,
    stand_cost_field,
    scenario_priorities,
    wp_colname,
    geo_wkt_field,
    geo_weight = 2,
    avg_cells_per_cluster = 10,
    seed = 42
) {
  # stand_data is assumed to only contain complete rows without NAs.
  # This generates a warning if that assumption is violated.
  if (!all(complete.cases(st_drop_geometry(stand_data)))) {
    warning('stand_data seems to contain rows with NAs')
  }

  # Creating data for clustering
  stand_data <- stand_data %>%
    # Calculating centroid coordinates
    mutate(
      lon = sf::st_coordinates(sf::st_centroid(geometry))[, 1],
      lat = sf::st_coordinates(sf::st_centroid(geometry))[, 2])

  # Running clustering algorithm
  set.seed(seed)
  clusters <- stand_data %>%
    tibble() %>%
    select(-geometry) %>%
    select({{wp_colname}}, lat, lon) %>%
    # Normalizing values for equal consideration
    mutate_all(normalize_values) %>%
    # Re-weighting geographic component
    # to increase / decrease the emphasis on a spatial pattern
    # and spatially contiguous clusters

    # TODO: depending on decision regarding `scenario_priorities`
    # this may need to be scaled up for multi-priority scenarios.
    mutate(
      lon = lon * geo_weight,
      lat = lat * geo_weight) %>%
    kmeans(centers = round(nrow(stand_data) / avg_cells_per_cluster))

  # Aggregating data by cluster
  output <- clusters %>%
    pluck("cluster") %>%
    add_column(stand_data, cluster = .) %>%
    group_by(cluster) %>%
    # Defining aggregation logic
    summarise(
      # TODO: we may need different aggregation functions for some variables?
      across(
        .cols = -any_of(c("geometry", geo_wkt_field)),
        .f = ~sum(.x, na.rm = TRUE))) %>%
    # Generating a new stand_id
    mutate(stand_id = row_number())

  return(output)
}
