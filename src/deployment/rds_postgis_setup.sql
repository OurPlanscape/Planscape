GRANT rds_superuser TO planscape;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
ALTER TABLE spatial_ref_sys OWNER TO planscape;
