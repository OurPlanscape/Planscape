
library(raster)
library(fasterize)
library(tidyverse)
library(sf)
library(microbenchmark)

# load buildings data for California
filepath <- 'analysis/data/California Building Outlines/California buildings.geojson'
buildings <- st_read(filepath)

# load an RRK metric for raster extent and resolution
accel_fn <- 'analysis/data/Sierra Nevada ACCEL/fireAdaptComm/DamagePotential_WUI_2022_300m_normalized.tif'
accel_extent <- raster(accel_fn)
# set all values to zero (just to be safe)
values(accel_extent) <- 0
names(accel_extent) <- 'buildings_present'
# set correct CRS
proj4string(accel_extent) <- CRS("+init=EPSG:3310")

# # test speed of functions
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
  mutate(n = 1) %>%
  st_transform(crs(accel_extent))

ggplot() +
  geom_sf(data = buildings_sample) +
  geom_sf(
    data = st_as_sfc(st_bbox(buildings)),
    fill = NA,
    color = 'red') +
  geom_sf(
    data = st_as_sfc(st_bbox(accel_extent)),
    fill = NA,
    color = 'blue')

# rasterize, checking if buildings are present in each cell
buildings_raster <- buildings %>%
  mutate(n = 1) %>%
  st_transform(crs(accel_extent)) %>%
  fasterize(
    raster = accel_extent,
    field = 'n',
    fun = 'sum',
    background = 0)
buildings_raster

writeRaster(buildings_raster, 'analysis/output/buildings_raster.tif')

