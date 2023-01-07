
library(raster)
library(tidyverse)
library(sf)
library(geojsonsf)

#library(jsonlite)
library(ndjson)

# load buildings outline
fn <- 'analysis/data/California Building Outlines/California.geojson'
#buildings_geojson <- jsonlite::fromJSON(fn)
buildings_geojson <- ndjson::stream_in(fn)
buildings_sf <- geojson_sf(buildings_geojson)

# load an RRK metric for raster extent and resolution
accel_fn <- 'analysis/data/Sierra Nevada ACCEL/fireAdaptComm/DamagePotential_WUI_2022_300m_normalized.tiff'
accel_extent <- raster(accel_fn)

