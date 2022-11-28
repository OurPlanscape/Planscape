CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
ALTER USER planscape CREATEDB;
SET postgis.enable_outdb_rasters = True;
SET postgis.gdal_enabled_drivers = 'GTiff JPEG PNG';