CREATE OR REPLACE FUNCTION martin_get_treatment_plan_prescriptions(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_project_area geometry;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_project_area (
    SELECT geometry FROM planning_projectarea WHERE id = (query_params->'project_area_id')::int
  );

  SELECT INTO p_stand_size (
    SELECT (configuration->'stand_size')::varchar FROM planning_scenario sc
    RIGHT JOIN planning_projectarea pa ON (pa.scenario_id = sc.id)
    WHERE pa.id = (query_params->'project_area_id')::int
  );

  SELECT INTO p_mvt ST_AsMVT(tile, 'martin_get_treatment_plan_prescriptions', 4096, 'geom') FROM (

    SELECT
      ss.id as "stand_id",
      ss.size as "stand_size",
      tx.id as "prescription_id",
      tx.treatment_plan_id as "treament_plan_id",
      tx.project_area_id as "project_area_id",
      tx.type as "prescription_type",
      tx.action as "prescription_action",
      ST_AsMVTGeom(
          ST_Transform(ST_CurveToLine(geometry), 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
    LEFT JOIN impacts_treatmentprescription tx ON (tx.stand_id = ss.id)
    WHERE 
        ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4269) AND
        ss.geometry && p_project_area AND ST_Intersects(ss.geometry, p_project_area) AND
        ss.size = p_stand_size AND
        tx.treatment_plan_id = (query_params->'treatment_plan_id')::int AND
        tx.project_area_id = (query_params->'project_area_id')::int
  ) as tile WHERE geom IS NOT NULL;

  RETURN mvt;
END 
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;