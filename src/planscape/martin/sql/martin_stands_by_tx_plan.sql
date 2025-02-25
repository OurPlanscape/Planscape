CREATE OR REPLACE FUNCTION martin_stands_by_tx_plan(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_stand_size (
    SELECT (configuration->>'stand_size')::varchar FROM planning_scenario sc
    RIGHT JOIN impacts_treatmentplan tp ON (tp.scenario_id = sc.id)
    WHERE tp.id = (query_params->>'treatment_plan_id')::int
  );

  WITH resumed_project_area AS (
    SELECT 
      pa.id AS "id",
      pa.name AS "name",
      pa.geometry AS "geometry"
    FROM 
      planning_projectarea pa
    LEFT JOIN planning_scenario sc ON (pa.scenario_id = sc.id)
    LEFT JOIN impacts_treatmentplan tp ON (sc.id = tp.scenario_id)
    WHERE 
      ((query_params->>'project_area_id') IS NULL OR pa.id = (query_params->>'project_area_id')::int) AND
      tp.id = (query_params->>'treatment_plan_id')::int AND
      pa.deleted_at IS NULL
  )SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_tx_plan', 4096, 'geom') FROM (

    SELECT
      ss.id as "id",
      ss.size as "stand_size",
      (query_params->>'treatment_plan_id') as "treatment_plan_id",
      rpa.id as "project_area_id",
      rpa.name as "project_area_name",
      ST_AsMVTGeom(
          ST_Transform(ss.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
    INNER JOIN resumed_project_area rpa ON ss.geometry && rpa.geometry AND
                                             ST_Within(ST_Centroid(ss.geometry), rpa.geometry)
    WHERE 
        ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.size = p_stand_size
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;