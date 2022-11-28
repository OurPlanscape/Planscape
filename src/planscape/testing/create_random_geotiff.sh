# Creates a small random GeoTIFF file for use in testing, in both GeoTIFF
# form and Postgres form for upload into the ConditionRaster table in the
# "condtions" app.

python create_random_geotiff.py
raster2pgsql -s 9822 -a -I -C -F -n name -f raster testdata/random_test.tif \
   public.conditions_conditionraster > testdata/random_test.sql