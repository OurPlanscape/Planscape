from django.db import migrations
from typing import Tuple

# Get condition stats fetches condition score statistics across condition
# raster pixels that intersect with a given geometry.
# Statistics include sus, meean, and count.
# Inputs include 1) raster details:
#   - table name (table, schema),
#   - raster name (raster_name)
#   - and relevant raster fields (raster_name_column, raster_column)
# and 2) geometry
#   - a shape in EWKB format
#
# An example call from Django python may be ...
# geo = Polygon(...)
# with connection.cursor() as cursor:
#     cursor.callproc(
#                'get_condition_stats',
#                ('conditions_conditionraster', 'public', 'biodiversity',
#                 'name', 'raster', geo.ewkb))
SQL = """
create or replace function get_condition_stats(
      param_table text,
      param_schema text,
      param_raster_name text,
      param_raster_name_column text,
      param_raster_column text,
      param_geom_ewkb bytea) returns TABLE(
                                         mean float,
                                         sum float,
                                         count bigint
                                     )
    immutable
    parallel safe
    cost 1000
    language plpgsql
as
$$
DECLARE
    var_count integer; var_sql text; var_geo geometry; 
    var_raster raster;
BEGIN  
    /* Checks that there is data for the raster requested */
    EXECUTE
       'SELECT count(*) As count' ||
        ' FROM ' || quote_ident(param_schema) || '.' || quote_ident(param_table) ||
        ' WHERE ' || quote_ident(param_raster_name_column) || ' = $1'
    INTO var_count
    USING param_raster_name;
    
    IF var_count = 0 THEN
       RETURN;
    END IF;

    /* Parses geometry passed in ewkb format, then transforms it into a raster proj4 CRS and annotates it with the raster SRID. */
    EXECUTE
       'SELECT ST_GeomFromEWKB($1)'
    INTO var_geo
    USING
      param_geom_ewkb;

    /* Retrieves, rasters with name, param_raster_name, clips them to the input geometry, and merges them. */
    EXECUTE
       'SELECT ST_Union(ST_Clip(' || quote_ident(param_table) || '.' || quote_ident(param_raster_column) || ', $2)) AS raster,' ||
       ' ' || quote_ident(param_table) || '.' || quote_ident(param_raster_name_column) || ' AS name' ||
       ' FROM ' || quote_ident(param_schema) || '.' || quote_ident(param_table) ||
       ' WHERE ' || quote_ident(param_table) || '.' || quote_ident(param_raster_name_column) || ' = $1' ||
       ' AND ST_Intersects(' || quote_ident(param_table) || '.' || quote_ident(param_raster_column) || ', $2)'
       ' GROUP BY name'
    INTO var_raster
    USING
      param_raster_name,
      var_geo;

    /* Computes mean score over pixels of the merged raster. */
    RETURN QUERY EXECUTE 
        'SELECT mean,sum,count' ||
        ' FROM ST_SummaryStats($1, 1, TRUE)'
    USING
        var_raster;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies: list[Tuple[str, str]] = [("conditions", "0002_get_rast_tile")]

    operations = [
        migrations.RunSQL(
            sql=SQL, reverse_sql="DROP FUNCTION IF EXISTS get_condition_stats;"
        )
    ]
