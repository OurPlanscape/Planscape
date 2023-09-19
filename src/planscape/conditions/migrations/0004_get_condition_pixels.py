from django.db import migrations
from typing import Tuple

# Get condition pixels fetches raw raster values for all pixels that intersect
# with a given geometry.
# Inputs include 1) raster details:
#   - table name (table, schema),
#   - raster name (raster_name)
#   - and relevant raster fields (raster_name_column, raster_column)
# and 2) geometry
#   - a shape in EWKB format
#
# Along with raw values, data indicating pixel position is returned. Table
# outputs include ...
#   - the top-left coordinate (xcoord, ycoord)
#   - pixel position relative to the top-left coordinate (x, y)
#   - raw raster pixel value (value)
#
# An example call from Django python may be ...
# geo = Polygon(...)
# with connection.cursor() as cursor:
#     cursor.callproc(
#                'get_condition_pixels',
#                ('conditions_conditionraster', 'public', 'biodiversity',
#                 'name', 'raster', geo.ewkb))
SQL = """
create or replace function get_condition_pixels(
      param_table text,
      param_schema text,
      param_raster_name text,
      param_raster_name_column text,
      param_raster_column text,
      param_geom_ewkb bytea) returns TABLE(
                                         upper_left_coord_x float,
                                         upper_left_coord_y float,
                                         pixel_dist_x integer,
                                         pixel_dist_y integer,
                                         value float
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

    /* Computes mean score over pixels of the merged raster. Note pixel 1 is located at index 1 (not 0). */
    RETURN QUERY EXECUTE 
        'SELECT ST_UpperLeftX($1) AS coord_x,' ||
               'ST_UpperLeftY($1) AS coord_y,' ||
               'x,' ||
               'y,' ||
               'ST_Value($1, 1, x, y) AS value ' ||
        'FROM generate_series(1, ST_Width($1)) AS x ' ||
                        'CROSS JOIN generate_series(1, ST_Height($1)) AS y '
        'WHERE ST_Value($1, 1, x, y) IS NOT NULL;'
    USING
        var_raster;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies: list[Tuple[str, str]] = [("conditions", "0003_get_condition_stats")]

    operations = [
        migrations.RunSQL(
            sql=SQL, reverse_sql="DROP FUNCTION IF EXISTS get_condition_pixels;"
        )
    ]
