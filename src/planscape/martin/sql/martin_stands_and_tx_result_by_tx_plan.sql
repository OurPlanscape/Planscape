CREATE OR REPLACE FUNCTION martin_stands_and_tx_result_by_tx_plan(z integer, x integer, y integer, query_params json)
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

  SELECT INTO tx_results (
    SELECT 
      ss.id as "id",
      ss.size as "stand_size",
      tr.variable as "variable",
      (query_params->>'treatment_plan_id') as "treatment_plan_id",
      (query_params->>'project_area_id')::int as "project_area_id",
      ST_AsMVTGeom(
          ST_Transform(ss.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom,
      SUM(CASE WHEN tr.year = 0 THEN tr.baseline ELSE 0 END) as "baseline_0",
      SUM(CASE WHEN tr.year = 0 THEN tr.value ELSE 0 END) as "value_0",
      SUM(CASE WHEN tr.year = 5 THEN tr.baseline ELSE 0 END) as "baseline_5",
      SUM(CASE WHEN tr.year = 5 THEN tr.value ELSE 0 END) as "value_5",
      SUM(CASE WHEN tr.year = 10 THEN tr.baseline ELSE 0 END) as "baseline_10",
      SUM(CASE WHEN tr.year = 10 THEN tr.value ELSE 0 END) as "value_10",
      SUM(CASE WHEN tr.year = 20 THEN tr.baseline ELSE 0 END) as "baseline_20",
      SUM(CASE WHEN tr.year = 20 THEN tr.value ELSE 0 END) as "value_20"
    FROM stands_stand ss
      LEFT JOIN impacts_treatmentprescription tp ON tp.stand_id = ss.id
      LEFT JOIN impacts_treatmentresult tr ON tr.treatment_prescription_id = tp.id
      ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.geometry && p_intersecting_area AND ST_Within(ST_Centroid(ss.geometry), p_intersecting_area) AND
        ss.size = p_stand_size
    GROUP BY 1, 2, 3, 4, 5, 6
  ) as tile WHERE geom IS NOT NULL;

  RETURN tx_results;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;