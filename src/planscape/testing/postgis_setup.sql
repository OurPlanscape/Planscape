CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
ALTER SYSTEM SET postgis.enable_outdb_rasters TO True;
ALTER SYSTEM SET postgis.gdal_enabled_drivers TO 'GTiff JPEG PNG';
SELECT pg_reload_conf();
CREATE USER planscape WITH PASSWORD 'pass';
ALTER USER planscape CREATEDB;
ALTER TABLE spatial_ref_sys OWNER TO planscape;
