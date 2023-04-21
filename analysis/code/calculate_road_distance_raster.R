
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
rrk_fn <- 'analysis/data/RRK - Sierra Nevada/forest_resilience/forest_composition_normalized.tif'
rrk_extent <- raster(rrk_fn)
# set all values to zero (just to be safe)
values(rrk_extent) <- 0
names(rrk_extent) <- 'road_distance'
# set correct CRS
proj4string(rrk_extent) <- CRS('+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs')

# check extent and alignment
roads_sample <- roads %>%
  sample_n(1e3) %>%
  select() %>%
  st_transform(crs(rrk_extent))
ggplot() +
  geom_sf(data = roads_sample) +
  geom_sf(
    data = roads %>%
      st_transform(crs(rrk_extent)) %>%
      st_bbox() %>%
      st_as_sfc(),
    fill = NA,
    color = 'red') +
  geom_sf(
    data = st_as_sfc(st_bbox(rrk_extent)),
    fill = NA,
    color = 'blue')

# rasterize, checking if roads are present in each cell
roads_raster <- roads %>%
  st_transform(crs(rrk_extent)) %>%
  select() %>%
  as_Spatial() %>%
  rasterize(y = rrk_extent)
writeRaster(
  x = roads_raster,
  filename = 'analysis/output/roads_raster.tif',
  overwrite = TRUE)

# make into NA or 0 values
roads_raster[!is.na(roads_raster)] <- 0
writeRaster(
  x = roads_raster,
  filename = 'analysis/output/roads_raster_boolean.tif',
  overwrite = TRUE)

# calculate distance from roads
roads_distance <- terra::distance(x = roads_raster)
writeRaster(
  x = roads_distance,
  filename = 'analysis/output/roads_distance.tif',
  overwrite = TRUE)

# # Code like below can be used to mask the raster to a specific region
# fire_mask <- raster('analysis/data/ACCEL RRK - all layers/fireDynamics/functional/BurnProbability_2022_300m.tif')
# roads_distance_sierra <- raster::mask(x = roads_distance, mask = fire_mask)