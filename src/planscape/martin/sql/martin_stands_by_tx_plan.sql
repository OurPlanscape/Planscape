CREATE OR REPLACE FUNCTION martin_stands_by_tx_plan(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_intersecting_area geometry;
  p_stand_size varchar;
BEGIN

  IF (query_params::jsonb) ? 'project_area_id' THEN
    SELECT INTO p_intersecting_area (
      SELECT 
        geometry 
      FROM 
        planning_projectarea pa
      WHERE 
        id = (query_params->>'project_area_id')::int AND
        pa.deleted_at IS NULL
    );
  ELSE 
    SELECT INTO p_intersecting_area (
      SELECT ST_Union(geometry) FROM planning_projectarea pa
      LEFT JOIN planning_scenario sc ON (pa.scenario_id = sc.id)
      LEFT JOIN impacts_treatmentplan tp ON (sc.id = tp.scenario_id)
      WHERE 
        tp.id = (query_params->>'treatment_plan_id')::int AND
        pa.deleted_at IS NULL

    );
  END IF;

  SELECT INTO p_stand_size (
    SELECT (configuration->>'stand_size')::varchar FROM planning_scenario sc
    RIGHT JOIN impacts_treatmentplan tp ON (tp.scenario_id = sc.id)
    WHERE tp.id = (query_params->>'treatment_plan_id')::int
  );

  SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_tx_plan', 4096, 'geom') FROM (

    SELECT
      ss.id as "id",
      ss.size as "stand_size",
      (query_params->>'treatment_plan_id') as "treatment_plan_id",
      (query_params->>'project_area_id')::int as "project_area_id",
      ST_AsMVTGeom(
          ST_Transform(ss.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
    WHERE 
        ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.geometry && p_intersecting_area AND ST_Within(ST_Centroid(ss.geometry), p_intersecting_area) AND
        ss.size = p_stand_size
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;