CREATE OR REPLACE FUNCTION martin_project_areas_by_scenario(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
BEGIN

  WITH base AS (
    SELECT
      pa.id as "id",
      pa.scenario_id::int as "scenario_id",
      pa.name,
      COALESCE(pa.data, '{}'::jsonb) ->> 'treatment_rank' as "rank",
      ST_Transform(pa.geometry, 3857) as "geom"
    FROM planning_projectarea pa
    WHERE 
        pa.deleted_at is NULL AND
        pa.scenario_id = (query_params->>'scenario_id')::int AND
        pa.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269)
  ), mvtpoly AS (
    SELECT
      id,
      scenario_id,
      name,
      rank,
      ST_AsMVTGeom(
        geom,
        ST_TileEnvelope(z, x, y),
        4096, 64, true) AS "geom"
    FROM base
    WHERE geom IS NOT NULL
  ), mvtpoint AS (
    SELECT
      id,
      scenario_id,
      name,
      rank,
      ST_AsMVTGeom(
        ST_PointOnSurface(geom),
        ST_TileEnvelope(z, x, y),
        4096, 64, true) AS "geom"
    FROM base
    WHERE 
      ST_PointOnSurface(base.geom) && ST_TileEnvelope(z, x, y, margin => (64.0 / 4096))
  ) 
  SELECT INTO p_mvt (
    (SELECT ST_AsMVT(mvtpoly.*, 'project_areas_by_scenario') FROM mvtpoly WHERE geom IS NOT NULL) ||
    (SELECT ST_AsMVT(mvtpoint.*, 'project_areas_by_scenario_label') FROM mvtpoint WHERE geom IS NOT NULL)
  );

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;