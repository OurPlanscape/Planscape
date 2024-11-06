CREATE OR REPLACE FUNCTION martin_stands_by_tx_result(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_intersecting_area geometry;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_intersecting_area (
    SELECT ST_Union(geometry) FROM planning_projectarea pa
    LEFT JOIN planning_scenario sc ON (pa.scenario_id = sc.id)
    LEFT JOIN impacts_treatmentplan tp ON (sc.id = tp.scenario_id)
    WHERE 
      tp.id = (query_params->>'treatment_plan_id')::int AND
      pa.deleted_at IS NULL

  );

  SELECT INTO p_stand_size (
    SELECT (configuration->>'stand_size')::varchar FROM planning_scenario sc
    RIGHT JOIN impacts_treatmentplan tp ON (tp.scenario_id = sc.id)
    WHERE tp.id = (query_params->>'treatment_plan_id')::int
  );


  WITH tx_result_year_0 AS(
    SELECT
      tr.year AS "year",
      tr.value AS "value",
      tr.baseline AS "baseline",
      tr.aggregation AS "aggregation",
      tr.variable AS "variable",
      tp.stand_id AS "stand_id",
      tp.action AS "action",
      tp.project_area_id AS "project_area_id"
      FROM impacts_treatmentresult tr
      INNER JOIN impacts_treatmentprescription tp ON tr.treatment_prescription_id = tp.id
      WHERE 
        tp.treatment_plan_id = (query_params->>'treatment_plan_id')::int 
        AND tr.variable = query_params->>'variable'
        AND tr.aggregation = 'MEAN'
        AND tr.year = 2024
  ), tx_result_year_5 AS(
    SELECT
      tr.year AS "year",
      tr.value AS "value",
      tr.baseline AS "baseline",
      tr.aggregation AS "aggregation",
      tr.variable AS "variable",
      tp.stand_id AS "stand_id",
      tp.action AS "action",
      tp.project_area_id AS "project_area_id"
      FROM impacts_treatmentresult tr
      INNER JOIN impacts_treatmentprescription tp ON tr.treatment_prescription_id = tp.id
      WHERE 
        tp.treatment_plan_id = (query_params->>'treatment_plan_id')::int 
        AND tr.variable = query_params->>'variable'
        AND tr.aggregation = 'MEAN'
        AND tr.year = 2029
  ), tx_result_year_10 AS(
    SELECT
      tr.year AS "year",
      tr.value AS "value",
      tr.baseline AS "baseline",
      tr.aggregation AS "aggregation",
      tr.variable AS "variable",
      tp.stand_id AS "stand_id",
      tp.action AS "action",
      tp.project_area_id AS "project_area_id"
      FROM impacts_treatmentresult tr
      INNER JOIN impacts_treatmentprescription tp ON tr.treatment_prescription_id = tp.id
      WHERE 
        tp.treatment_plan_id = (query_params->>'treatment_plan_id')::int 
        AND tr.variable = query_params->>'variable'
        AND tr.aggregation = 'MEAN'
        AND tr.year = 2034
  ), tx_result_year_15 AS(
    SELECT
      tr.year AS "year",
      tr.value AS "value",
      tr.baseline AS "baseline",
      tr.aggregation AS "aggregation",
      tr.variable AS "variable",
      tp.stand_id AS "stand_id",
      tp.action AS "action",
      tp.project_area_id AS "project_area_id"
      FROM impacts_treatmentresult tr
      INNER JOIN impacts_treatmentprescription tp ON tr.treatment_prescription_id = tp.id
      WHERE 
        tp.treatment_plan_id = (query_params->>'treatment_plan_id')::int 
        AND tr.variable = query_params->>'variable'
        AND tr.aggregation = 'MEAN'
        AND tr.year = 2039
  ), tx_result_year_20 AS(
    SELECT
      tr.year AS "year",
      tr.value AS "value",
      tr.baseline AS "baseline",
      tr.aggregation AS "aggregation",
      tr.variable AS "variable",
      tp.stand_id AS "stand_id",
      tp.action AS "action",
      tp.project_area_id AS "project_area_id"
      FROM impacts_treatmentresult tr
      INNER JOIN impacts_treatmentprescription tp ON tr.treatment_prescription_id = tp.id
      WHERE 
        tp.treatment_plan_id = (query_params->>'treatment_plan_id')::int 
        AND tr.variable = query_params->>'variable'
        AND tr.aggregation = 'MEAN'
        AND tr.year = 2044
  ) SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_tx_result', 4096, 'geom') FROM (
    SELECT 
      ss.id as "id",
      ss.size as "stand_size",
      tr0.variable as "variable",
      tr0.action as "action",
      tr0.project_area_id as "project_area_id",
      (query_params->>'treatment_plan_id') as "treatment_plan_id",
      tr0.baseline AS "baseline_0",
      tr0.value AS "value_0",
      tr5.baseline AS "baseline_5",
      tr5.value AS "value_5",
      tr10.baseline AS "baseline_10",
      tr10.value AS "value_10",
      tr15.baseline AS "baseline_15",
      tr15.value AS "value_15",
      tr20.baseline AS "baseline_20",
      tr20.value AS "value_20",
      ST_AsMVTGeom(
          ST_Transform(ss.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
      LEFT JOIN tx_result_year_0 tr0 ON tr0.stand_id = ss.id
      LEFT JOIN tx_result_year_5 tr5 ON tr5.stand_id = ss.id
      LEFT JOIN tx_result_year_10 tr10 ON tr10.stand_id = ss.id
      LEFT JOIN tx_result_year_15 tr15 ON tr15.stand_id = ss.id
      LEFT JOIN tx_result_year_20 tr20 ON tr20.stand_id = ss.id
    WHERE
      ss.size = p_stand_size AND
      ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.geometry && p_intersecting_area AND ST_Within(ST_Centroid(ss.geometry), p_intersecting_area)
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;