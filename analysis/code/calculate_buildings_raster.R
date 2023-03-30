
library(raster)
library(fasterize)
library(tidyverse)
library(sf)

# load buildings data for California
filepath <- 'analysis/data/California Building Outlines/California buildings.geojson'
buildings <- st_read(filepath)

# load an RRK metric for raster extent and resolution
rrk_fn <- 'analysis/data/RRK - Sierra Nevada/forest_resilience/forest_composition_normalized.tif'
rrk_extent <- raster(rrk_fn)
# set all values to zero (just to be safe)
values(rrk_extent) <- 0
names(rrk_extent) <- 'buildings_present'
# set correct CRS
proj4string(rrk_extent) <- CRS('+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs')

# # test speed of functions
# library(microbenchmark)
# pols <- buildings %>%
#   sample_n(1e3) %>%
#   mutate(n = 1)
# bench <- microbenchmark::microbenchmark(
#   rasterize = r <- raster::rasterize(pols, accel_extent, field = 'n', fun = 'sum'),
#   fasterize = f <- fasterize(pols, accel_extent, field = 'n', fun = 'sum'),
#   unit = 's')
# bench
# # fasterize is 100x faster!

# check extent and alignment
buildings_sample <- buildings %>%
  sample_n(1e3) %>%
  select() %>%
  st_transform(crs(rrk_extent))

ggplot() +
  geom_sf(data = buildings_sample) +
  geom_sf(
    data = buildings %>%
      st_transform(crs(rrk_extent)) %>%
      st_bbox() %>%
      st_as_sfc(),
    fill = NA,
    color = 'red') +
  geom_sf(
    data = st_as_sfc(st_bbox(rrk_extent)),
    fill = NA,
    color = 'blue')

# rasterize, checking if buildings are present in each cell
buildings_raster <- buildings %>%
  mutate(n = 1) %>%
  st_transform(crs(rrk_extent)) %>%
  fasterize(
    raster = rrk_extent,
    field = 'n',
    fun = 'sum',
    background = 0)
names(buildings_raster) <- 'buildings'

buildings_raster

writeRaster(
  x = buildings_raster,
  filename = 'analysis/output/buildings_raster.tif',
  overwrite = TRUE)

# # Code like below can be used to mask the raster to a specific region
# fire_mask <- raster('analysis/data/ACCEL RRK - all layers/fireDynamics/functional/BurnProbability_2022_300m.tif')
# buildings_raster_sierra <- raster::mask(x = buildings_raster, mask = fire_mask)