CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
ALTER DATABASE template1 SET postgis.enable_outdb_rasters = True;
ALTER DATABASE template1 SET postgis.gdal_enabled_drivers = 'GTiff JPEG PNG';
CREATE USER planscape WITH PASSWORD 'pass';
ALTER USER planscape CREATEDB;
ALTER TABLE spatial_ref_sys OWNER TO planscape;