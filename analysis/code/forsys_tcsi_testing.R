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

# Select HUC12 planning area
HUC12 = 3436

shape_huc12 <- st_read('analysis/data/TCSI/HUC12/huc12_merge_sierra_proj_tcsi_clip.shp')
shape_ownership <- st_read('analysis/data/TCSI/iCluse/iCLUSE.shp')
score_adapt <- raster('analysis/data/TCSI/ecosystem/tif/adapt.tif')
score_protect <- raster('analysis/data/TCSI/ecosystem/tif/protect.tif')
input_operability <- raster('analysis/data/TCSI/operability_class_with_scA_final.tif')
input_spottedowlhabitat <- raster('analysis/data/TCSI/cso_habitat_18Oct2021.tif')

# Calculating opportunity score (a.k.a. Adapt-Protect score)
score_rescale <- function(score1, score2) {
  max_value <- max(score1, score2)
  rescale_factor <- (2 - sqrt(2)) / sqrt(2)
  value <- (2 * max_value + rescale_factor - 1)/(rescale_factor + 1)
  return(value)
}
score_ap <- score_rescale(score_adapt, score_protect)

# Sub-setting data for one specific planning HUC 12
planning_score <- score_ap %>%
  raster::crop(filter(shape_huc12, OBJECTID == {{HUC12}})) %>%
  mask(filter(shape_huc12, OBJECTID == {{HUC12}}))

planning_polygon <- planning_score %>%
  # Converting raster to polygon (this will take some time, use subset raster!)
  as('SpatialPolygonsDataFrame') %>%
  st_as_sf() %>%
  # Dropping empty rows
  filter(!is.na(layer)) %>%
  # Creating "stand id" from row number
  mutate(
    impact_score = layer,
    stand_id = row_number(),
    stand_area = 30 * 30,
    project_area_1 = stand_id <= 1000,
    project_area_2 = stand_id > 1000 & stand_id <= 5000,
    project_area_3 = stand_id > 100000 & stand_id < 165900
    # proj_id = case_when(
    #   stand_id <= 1000 ~ 'A',
    #   stand_id > 1000 & stand_id <= 5000 ~ 'B',
    #   stand_id > 100000 & stand_id < 165900 ~ 'C',
    #   TRUE ~ na_chr
    #   )
    )

# Calculating adjacency for polygons
adj <- Patchmax::calculate_adj(
  Shapefile = planning_polygon,
  St_id = df_planning$id,
  method = 'buffer')
