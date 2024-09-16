  CREATE OR REPLACE FUNCTION martin_project_area_aggregate(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS $$
  DECLARE
    p_mvt bytea;
    p_project_area geometry;
    p_stand_geometries geometry;
    p_stand_size varchar;
  BEGIN

    SELECT INTO p_project_area (
      SELECT 
        geometry 
      FROM planning_projectarea pa
      WHERE 
        id = (query_params->>'project_area_id')::int AND
        pa.deleted_at IS NULL
    );

    SELECT INTO p_stand_size (
      SELECT (configuration->>'stand_size')::varchar FROM planning_scenario sc
      RIGHT JOIN planning_projectarea pa ON (pa.scenario_id = sc.id)
      WHERE pa.id = (query_params->>'project_area_id')::int
    );

    SELECT INTO p_stand_geometries (
      SELECT 
        ST_Union(ss.geometry)
      FROM stands_stand ss
      WHERE 
          ss.geometry && p_project_area AND ST_Within(ST_Centroid(ss.geometry), p_project_area) AND
          ss.size = p_stand_size
    );
    
    WITH base AS (
      SELECT
        query_params->>'project_area_id' as "id",
        ST_Transform(p_stand_geometries, 3857) as "geom"
    ), mvtpoly AS (
      SELECT 
        id,
        ST_AsMVTGeom(
          geom,
          ST_TileEnvelope(z, x, y),
          4096, 
          64,
          true
        ) AS "geom"
      FROM base
    ), mvtpoint AS (
      SELECT
        id,
        ST_AsMVTGeom(
          ST_PointOnSurface(geom),
          ST_TileEnvelope(z, x, y),
          4096, 
          64,
          true
        ) AS "geom"
      FROM base
      WHERE
        ST_PointOnSurface(base.geom) && ST_TileEnvelope(z, x, y, margin => (64.0 / 4096))
    ) SELECT INTO p_mvt (
        (SELECT ST_AsMVT(mvtpoly.*, 'project_area_aggregate') FROM mvtpoly WHERE geom IS NOT NULL) ||
        (SELECT ST_AsMVT(mvtpoint.*, 'project_area_aggregate_label') FROM mvtpoint WHERE geom IS NOT NULL)
    );
      
    RETURN p_mvt;
  END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;