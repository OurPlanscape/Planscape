
library(raster)
library(fasterize)
library(tidyverse)
library(sf)
library(fs)
library(terra)

# loading roads into memory
road_files <- 'analysis/data/California Roads by County/' |>
  fs::dir_ls(recurse = TRUE) |>
  str_subset('.shp$')
roads <- road_files |>
  map(st_read) |>
  bind_rows()

# load an RRK metric for raster extent and resolution
accel_fn <- 'analysis/data/Sierra Nevada ACCEL/fireAdaptComm/DamagePotential_WUI_2022_300m_normalized.tif'
accel_extent <- raster(accel_fn)
# set all values to zero (just to be safe)
values(accel_extent) <- 0
names(accel_extent) <- 'buildings_present'
# set correct CRS
proj4string(accel_extent) <- CRS("+init=EPSG:3310")

# rasterize, checking if roads are present in each cell
roads_raster <- roads %>%
  st_transform(crs(accel_extent)) %>%
  select() %>%
  as_Spatial() %>%
  rasterize(y = accel_extent)
writeRaster(roads_raster, 'analysis/output/roads_raster.tif')

# make into NA or 0 values
roads_raster[!is.na(roads_raster)] <- 0
writeRaster(roads_raster, 'analysis/output/roads_raster_boolean.tif')

# calculate distance from roads
roads_distance <- terra::distance(x = roads_raster)
writeRaster(roads_distance, 'analysis/output/roads_distance.tif')
