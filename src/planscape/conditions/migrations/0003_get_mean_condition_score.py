from django.db import migrations
from typing import Tuple

SQL = """
create or replace function get_mean_condition_score(
      param_table text,
      param_schema text,
      param_raster_name text,
      param_raster_name_column text,
      param_raster_column text,
      param_raster_proj4 text,
      param_raster_srid integer,
      param_bbox_xmin numeric,
      param_bbox_xmax numeric,
      param_bbox_ymin numeric,
      param_bbox_ymax numeric,
      param_bbox_srid integer) returns float
    immutable
    parallel safe
    cost 1000
    language plpgsql
as
$$
DECLARE
    var_count integer; var_sql text; var_result raster; var_env geometry; var_env_trans geometry;
    var_raster raster; var_avg float;
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
       'SELECT ST_MakeEnvelope($1, $2, $3, $4, $5)::geometry'
    INTO var_env
    USING
      param_bbox_xmin,
      param_bbox_ymin,
      param_bbox_xmax,
      param_bbox_ymax,
      param_bbox_srid;

    EXECUTE
        'SELECT ST_SetSRID(ST_Transform($1, $2), $3)'
    INTO var_env_trans
    USING
      var_env,
      param_raster_proj4,
      param_raster_srid;

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
      var_env_trans;

    EXECUTE 
        'SELECT mean' ||
        ' FROM ST_SummaryStats($1, 1, TRUE)'
    INTO var_avg
    USING
        var_raster;

    RETURN var_avg;
END;
$$;
"""

class Migration(migrations.Migration):

    dependencies: list[Tuple[str, str]] = [
      ('conditions', '0002_get_rast_tile')
    ]

    operations = [migrations.RunSQL(sql=SQL, reverse_sql='DROP FUNCTION IF EXISTS get_raster_for_extent;')]
