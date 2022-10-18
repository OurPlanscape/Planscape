library(raster)
library(tidyverse)

score_monitor <- raster('analysis/data/TCSI/ecosystem/tif/monitor.tif')
score_protect <- raster('analysis/data/TCSI/ecosystem/tif/protect.tif')
score_adapt <- raster('analysis/data/TCSI/ecosystem/tif/adapt.tif')
score_transform <- raster('analysis/data/TCSI/ecosystem/tif/transform.tif')

x <- score_monitor + score_protect + score_adapt + score_transform
plot(x)

ap <- score_monitor <- raster('analysis/data/TCSI/ecosystem/tif/ap.tif')
plot(ap)
