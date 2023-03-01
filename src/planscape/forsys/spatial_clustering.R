suppressMessages({
    library(sf)
    # TODO: switch?
    library(tidyverse)
})

normalize_values <- function(x) {
  (x - min(x)) / (max(x) - min(x))
}

cluster_cells_to_stands <- function(
    stand_data,
    stand_id_field = "stand_id",
    stand_area_field = "area",
    stand_cost_field = "cost",
    scenario_priorities = c(
      "priority1",
      "priority2",
      "priority3",
      "priority4"),
    geo_weight = 2,
    avg_cells_per_cluster = 10,
    seed = 42
) {

  # Creating data for clustering
  stand_data <- stand_data %>%
    # select(
    #   {{stand_id_field}},
    #   {{stand_area_field}},
    #   {{stand_cost_field}},
    #   one_of({{scenario_priorities}})) %>%
    # TODO: what to do about NA values?
    # drop_na() %>%
    # Calculating centroid coordinates
    mutate(
      lon = sf::st_coordinates(sf::st_centroid(geometry))[,1],
      lat = sf::st_coordinates(sf::st_centroid(geometry))[,2])

  # Running clustering algorithm
  set.seed(seed)
  clusters <- stand_data %>%
    tibble() %>%
    select(-geometry) %>%
    select(one_of({{scenario_priorities}}), lat, lon) %>%
    # Normalizing values for equal consideration
    mutate_all(normalize_values) %>%
    # Re-weighting geographic component
    # to increase / decrease the emphasis on a spatial pattern
    # and spatially contiguous clusters
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
      area = sum(area),
      # TODO: we may need different aggregation functions for some variables?
      across(-geometry, .f = ~sum(.x, na.rm = TRUE))) %>%
    # Generating a new stand_id
    mutate(stand_id = row_number())

  return(output)
}

# # Can use below to test:
# library(forsys)
# data("test_forest")
# df <- test_forest %>%
#   {.[1:500, ]} %>%
#   rename(c(
#     "area" = "area_ha",
#     "cost" = "mosaic1")) %>%
#   cluster_cells_to_stands()
