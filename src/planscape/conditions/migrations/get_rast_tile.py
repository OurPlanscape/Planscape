from typing import Tuple

from django.contrib.postgres.operations import CreateExtension
from django.db import migrations

SQL = """
create or replace function get_rast_tile(
      param_format text,
	  param_width integer,
	  param_height integer,
	  param_srid integer,
      param_bbox_xmin numeric,
	  param_bbox_ymin numeric,
	  param_bbox_xmax numeric,
	  param_bbox_ymax numeric,
	  param_colormap text,
	  param_schema text,
      param_table text,
      param_raster_column text,
      param_raster_name_column text,
      param_raster_name text) returns bytea
    immutable
    parallel safe
    cost 1000
    language plpgsql
as
$$
DECLARE
    var_count integer; var_sql text; var_result raster; var_srid integer;
    var_env geometry; var_env_buf geometry; var_erast raster;
BEGIN
    /* Check that there is data for the raster requested */
    EXECUTE
       'SELECT count(*) As count' ||
        ' FROM ' || quote_ident(param_schema) || '.' || quote_ident(param_table) ||
        ' WHERE ' || quote_ident(param_raster_name_column) || ' = $1'
    INTO var_count
    USING param_raster_name;

    IF var_count = 0 THEN
       RETURN NULL;
    END IF;

    /* var_env := bounding box as a polygon in the output reference geometry. */
    EXECUTE
       'SELECT ST_MakeEnvelope($1, $2, $3, $4, $5)'
    INTO var_env
    USING
      param_bbox_xmin,
      param_bbox_ymin,
      param_bbox_xmax,
      param_bbox_ymax,
      param_srid;    

    /* var_env_buf := bounding box expanded by 20 meters. */
    EXECUTE
        'SELECT ST_Buffer($1, 20);'
    USING var_env
    INTO var_env_buf; 

    /* var_srid := stored reference geometry
       var_erast := raster for the unextended bounding box */
    var_sql :=
        'SELECT srid, ST_AsRaster($4,$5,$6,pixel_types,nodata_values,nodata_values) As erast
         FROM raster_columns
         WHERE r_table_schema = $1 AND r_table_name = $2 AND r_raster_column=$3';
    EXECUTE var_sql INTO var_srid, var_erast
    USING param_schema, param_table, param_raster_column,
          var_env, param_width, param_height;

    /* Compute var_result:
       . Find the rasters in the stored data that intersect the bounding box
       . Clip them to the transformed bounding box
       . Transform those rasters to the output reference geometry (param_srid)
       . Resample them to the raster version of the bounding box (var_erast)
       . Union them, and clip the union to the output reference geometry bounding box 
    */
    var_sql :=
        'WITH r AS (SELECT ST_Clip(%1$I, ST_Transform($3, $5)) As rast FROM ' ||
                    quote_ident(param_schema) || '.' || quote_ident(param_table) ||
        '           WHERE %2$I = $6 AND 
                      ST_Intersects(%1$I, ST_Transform($1, $5)) limit 15)
        SELECT ST_Clip(ST_Union(rast), $1) As rast
        FROM (SELECT ST_Resample(ST_Transform(rast, $4), $2, true,''NearestNeighbor'') As rast FROM r) As final';

    EXECUTE FORMAT(var_sql, param_raster_column, param_raster_name_column)
    INTO var_result
    USING
        var_env,
        var_erast,
        var_env_buf,
        param_srid,
	    var_srid,
        param_raster_name;

    /* Cut the extent of var_result down to the unextended bounding box,
       convert the var_result to 8-bit unsigned ints, and transform to output geometry. */
    var_sql :=
        'SELECT ST_Transform(ST_MapAlgebra($1, $2, ''[rast2]'', ''8BUI''::text,
	                                   ''FIRST'', ''[rast2]'', NULL::text), $3) rast';
    EXECUTE var_sql INTO var_result
    USING var_erast, var_result, param_srid;
    
    IF var_result IS NULL THEN
        var_result := var_erast;
    END IF;

    RETURN
        CASE
            WHEN param_format ILIKE 'image/jpeg' THEN ST_AsJPEG(ST_ColorMap(var_result, 1, param_colormap))
            ELSE ST_AsPNG(ST_ColorMap(var_result, 1, param_colormap))
            END;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies: list[Tuple[str, str]] = []

    operations = [
        CreateExtension("postgis"),
        CreateExtension("postgis_raster"),
        migrations.RunSQL(SQL),
    ]
