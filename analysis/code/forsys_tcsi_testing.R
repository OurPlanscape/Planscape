#' Forsys TCSI testing
#' 
#' RScript for a test analysis of a single HUC12 in the TCSI area.
#' The purpose of this script is to explore and illustrate the running of
#' ForSysR in a real-world example using actual input data, so that we can
#' understand the program API, input parameters, outputs, and estimate runtime.

#' To install ForSysR and Patchmax from GitHub:
#' library(jsonlite)
#' library(devtools)
#' 
#' # Installation needs access to private repository
#' github_token <- read_json('analysis/code/.access_codes')$github
#' 
#' install_github("forsys-sp/forsysr", auth_token=github_token)
#' install_github("forsys-sp/patchmax", auth_token=github_token)

library(forsys)
library(sf)
library(raster)
library(tidyverse)
library(magrittr)

# Select HUC12 planning area
HUC12 = 3436
run_label = 'TCSI_downsample'


# Loading input data -----------------------------------------------------------
shape_huc12 <- st_read('analysis/data/TCSI/HUC12/huc12_merge_sierra_proj_tcsi_clip.shp')
shape_ownership <- st_read('analysis/data/TCSI/iCluse/iCLUSE.shp')

#' Operability layer:
#' 0 - Inoperable
#' 1 - Mechanical
#' 2 - Hand
#' 3 - Rx (=prescribed) fire
input_operability <- raster('analysis/data/TCSI/operability_class_with_scA_final.tif')
input_spottedowlhabitat <- raster('analysis/data/TCSI/cso_habitat_18Oct2021.tif')

#' Harvesting layers:
#' 0 - none
#' 1 - skidd
#' 2 - cable
#' 3 - helicopter
fp_harvesting <- 'analysis/data/TCSI/Cost and operability-selected/'
harvest_system <- raster(paste0(fp_harvesting, 'potential_harv_system.tif'))
harvest_cable <- raster(paste0(fp_harvesting, 'cable_saw_cost.tif'))
harvest_skidd <- raster(paste0(fp_harvesting, 'skidder_saw_cost.tif'))
harvest_helic <- raster(paste0(fp_harvesting, 'helicopter_saw_cost.tif'))
harvest_cost <- raster(paste0(fp_harvesting, 'potential_harv_system.tif'))

score_adapt <- raster('analysis/data/TCSI/ecosystem/tif/adapt.tif')
score_protect <- raster('analysis/data/TCSI/ecosystem/tif/protect.tif')

# Calculating opportunity score (a.k.a. Adapt-Protect score)
score_rescale <- function(raster1, raster2) {
  max_value <- max(raster1, raster2)
  rescale_factor <- (2 - sqrt(2)) / sqrt(2)
  raster_rescaled <- (2 * max_value + rescale_factor - 1) / (rescale_factor + 1)
  return(raster_rescaled)
}
input_opportunity <- score_rescale(score_adapt, score_protect)


# Transforming input data ------------------------------------------------------

# Sub-setting data for one specific planning HUC 12
raster_mask <- function(raster_input, shape, id) {
  mask_shape <- filter(shape, OBJECTID == id)
  raster_masked <- raster_input %>%
    raster::crop(mask_shape) %>%
    raster::mask(mask_shape)
  return(raster_masked)
}

input_opportunity <- raster_mask(input_opportunity, shape_huc12, HUC12)
input_operability <- raster_mask(input_operability, shape_huc12, HUC12)

harvest_system <- raster_mask(harvest_system, shape_huc12, HUC12)
harvest_skidd <- raster_mask(harvest_skidd, shape_huc12, HUC12)
harvest_cable <- raster_mask(harvest_cable, shape_huc12, HUC12)
harvest_helic <- raster_mask(harvest_helic, shape_huc12, HUC12)
harvest_cost <- raster_mask(harvest_cost, shape_huc12, HUC12)

# Converting raster to coarser resolution to speed up processing for now
input_opportunity <- aggregate(input_opportunity, fact = 4, fun = max)
input_operability <- aggregate(input_operability, fact = 4, fun = max)
input_spottedowlhabitat <- aggregate(input_spottedowlhabitat, fact = 4, fun = max)

harvest_system <- aggregate(harvest_system, fact = 2, fun = max)
harvest_skidd <- aggregate(harvest_skidd, fact = 2, fun = max)
harvest_cable <- aggregate(harvest_cable, fact = 2, fun = max)
harvest_helic <- aggregate(harvest_helic, fact = 2, fun = max)
harvest_cost <- aggregate(harvest_cost, fact = 2, fun = max)

# Getting costs for harvesting with cheapest available system
harvest_cost[harvest_system == 3] <- harvest_helic[harvest_system == 3]
harvest_cost[harvest_system == 2] <- harvest_cable[harvest_system == 2]
harvest_cost[harvest_system == 1] <- harvest_skidd[harvest_system == 1]
# Making rasters line up exactly
harvest_cost <- resample(x = harvest_cost, y = input_opportunity, 'ngb')

planning_polygon <- input_opportunity %>%
  # Adding other variables
  stack(
    input_operability,
    harvest_cost) %>%
  #stack(input_spottedowlhabitat) %>%
  # Converting raster to polygon (this will take some time, use subset raster!)
  as('SpatialPolygonsDataFrame') %>%
  st_as_sf() %>%
  # Dropping empty rows
  dplyr::filter(!is.na(layer)) %>%
  # Cleaning up fields
  dplyr::transmute(
    stand_id = row_number(),
    stand_area = 30 * 30 * 4 * 4,
    opportunity_score = layer,
    operability = operability_class_with_scA_final,
    # Making sure there are no holes in the cost layer.
    #TODO: is there a better way to do this?
    harvest_cost = case_when(
      potential_harv_system == 0.0 | is.nan(potential_harv_system) ~ max(potential_harv_system),
      TRUE ~ potential_harv_system),
    lon = sf::st_coordinates(st_centroid(geometry))[,1],
    lat = sf::st_coordinates(st_centroid(geometry))[,2])
    # # Creating "stand id" from row number
    # proj_id = case_when(
    #   stand_id <= 1000 ~ 1L,
    #   stand_id > 1000 & stand_id <= 5000 ~ 2L,
    #   stand_id > 100000 & stand_id < 165900 ~ 3L,
    #   TRUE ~ na_int))

planning_polygon %>% drop_na %>% plot(border = NA)

# Running ForSysR --------------------------------------------------------------

# Calculating adjacency for polygons
patchmax_adj <- Patchmax::calculate_adj(
  Shapefile = planning_polygon,
  St_id = planning_polygon$stand_id,
  method = 'buffer')

patchmax_dist <- Patchmax::calculate_dist(planning_polygon)

forsys_output <- forsys::run(
  return_outputs = TRUE,
  stand_data = planning_polygon,
  scenario_name = 'tcsi_testing_patchmax',
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'stand_area',
  stand_threshold = 'operability > 0',
  scenario_priorities = c('opportunity_score', 'harvest_cost'),
  scenario_output_fields = c('opportunity_score'),
  run_with_patchmax = TRUE,
  patchmax_stnd_adj = patchmax_adj,
  patchmax_st_distance = patchmax_dist,
  #patchmax_SDW = 10,
  patchmax_proj_size = 4046860 / (4 * 4), #1000
  patchmax_proj_size_slack = 0.5,
  patchmax_candidate_min_size = 404686 / (4 * 4),
  patchmax_proj_number = 3
  )
write_rds(x = forsys_output, file = 'analysis/output/TCSI_forsys_run.rds')


planning_polygon %>%
  select(-proj_id) %>%
  left_join(forsys_output$stand_output, by = 'stand_id') %>%
  mutate(proj_id = replace_na(proj_id, replace = 0)) %>%
  select(proj_id, geometry) %>%
  st_as_sf() %>%
  plot(border = NA)

planning_polygon %>%
  select(-proj_id) %>%
  left_join(forsys_output$stand_output, by = 'stand_id') %>%
  mutate(proj_id = replace_na(proj_id, replace = 0)) %>%
  select(proj_id, geometry) %>%
  st_as_sf() %>%
  plot(border = NA)

planning_polygon %>%
  select(-proj_id) %>%
  left_join(forsys_output$stand_output, by = 'stand_id') %>%
  mutate(proj_id = replace_na(proj_id, replace = 0)) %>%
  select(-stand_id, -stand_area, -opportunity_score.y, -opportunity_score_PCP, -Pr_1_opportunity_score, -ETrt_YR) %>%
  mutate(top_5_perc = percent_rank(opportunity_score.x) >= 0.95) %>%
  st_as_sf() %>%
  plot(border = NA)


# Stand Clustering -------------------------------------------------------------

library(dbscan)
normalize_values <- function(x) {
  (x - min(x)) / (max(x) - min(x))
}

cluster_geo_weight = 2
cluster_variables = c(
  'lon',
  'lat',
  'opportunity_score',
  'operability',
  'harvest_cost')

# Creating data for clustering
df <- planning_polygon %>%
  select(one_of(cluster_variables)) %>%
  drop_na()

# Running clustering algorithm
set.seed(42)
clusters <- df %>%
  tibble() %>%
  select(-geometry) %>%
  # Normalizing values for equal consideration
  mutate_all(normalize_values) %>%
  # Re-weighting geographic component
  # to increase / decrease the emphasis on a spatial pattern
  # and spatially contiguous clusters
  mutate(
    lon = lon * geo_weight,
    lat = lat * geo_weight) %>%
  kmeans(centers = round(nrow(df) / 10))

#clusters <- hdbscan(df, minPts = 9)

# Visualizing the ouput clusters
clusters %>%
  pluck('cluster') %>%
  # as.character() %>%
  # str_pad(pad = '0', width = 2) %>%
  add_column(df, cluster = .) %>%
  # Reordering rows randomly to get distinct colors
  sample_n(., size = nrow(.)) %>%
  #sample_n(10) %>%
  #mutate(cluster = as.factor(cluster)) %>%
  ggplot(aes(x = lon, y = lat, fill = cluster)) +
  geom_point(
    size  = 2.5,
    stroke = 0,
    shape = 22    #alpha = .3)
  ) +
  theme_minimal() +
  #scale_fill_discrete(palette = 'rainbow')
  scale_fill_binned(type = 'viridis')


clusters %>%
  pluck('cluster') %>%
  # as.character() %>%
  # str_pad(pad = '0', width = 2) %>%
  add_column(df, cluster = .) 




