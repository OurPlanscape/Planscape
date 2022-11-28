CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
SET postgis.enable_outdb_rasters = True;
SET postgis.gdal_enabled_drivers = 'GTiff JPEG PNG';
CREATE USER planscape WITH PASSWORD 'pass';
ALTER USER planscape CREATEDB;