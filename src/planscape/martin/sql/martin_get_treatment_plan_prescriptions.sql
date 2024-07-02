CREATE OR REPLACE FUNCTION martin_get_treatment_plan_prescriptions(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_project_area geometry;
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

  IF (query_params::jsonb) ? 'treatment_plan_id' THEN

    SELECT INTO p_mvt ST_AsMVT(tile, 'treatment_plan_prescriptions', 4096, 'geom') FROM (

      SELECT
        ss.id as "id",
        ss.size as "stand_size",
        it.treatment_plan_id,
        it.project_area_id,
        it.type,
        it.action,
        ST_AsMVTGeom(
            ST_Transform(ss.geometry, 3857),
            ST_TileEnvelope(z, x, y),
            4096, 64, true) AS geom
      FROM stands_stand ss
      LEFT JOIN impacts_treatmentprescription it ON (ss.id = it.stand_id)
      WHERE 
          ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
          ss.geometry && p_project_area AND ST_Intersects(ss.geometry, p_project_area) AND
          ss.size = p_stand_size AND
          (it.treatment_plan_id = (query_params->>'treatment_plan_id')::int OR it.treatment_plan_id IS NULL)
    ) as tile WHERE geom IS NOT NULL;
  
  ELSE

    SELECT INTO p_mvt ST_AsMVT(tile, 'treatment_plan_prescriptions', 4096, 'geom') FROM (

      SELECT
        ss.id as "id",
        ss.size as "stand_size",
        NULL as "treatment_plan_id",
        query_params->>'project_area_id'::int as "project_area_id",
        NULL as "type",
        NULL as "action",
        ST_AsMVTGeom(
            ST_Transform(ss.geometry, 3857),
            ST_TileEnvelope(z, x, y),
            4096, 64, true) AS geom
      FROM stands_stand ss
      WHERE 
          ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
          ss.geometry && p_project_area AND ST_Intersects(ss.geometry, p_project_area) AND
          ss.size = p_stand_size
    ) as tile WHERE geom IS NOT NULL;

  END IF;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;