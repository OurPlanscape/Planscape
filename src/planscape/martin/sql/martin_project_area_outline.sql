CREATE OR REPLACE FUNCTION martin_project_area_outline(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_project_area geometry;
  p_stand_geometries geometry;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_project_area (
    SELECT geometry FROM planning_projectarea WHERE id = (query_params->>'project_area_id')::int
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
        ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.geometry && p_project_area AND ST_Intersects(ss.geometry, p_project_area) AND
        ss.size = p_stand_size
  );

  SELECT INTO p_mvt ST_AsMVT(tile, 'project_area_outline', 4096, 'geom') FROM (
    SELECT
      (query_params->>'project_area_id')::int as "id",
      ST_AsMVTGeom(
          ST_Transform(p_stand_geometries, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;