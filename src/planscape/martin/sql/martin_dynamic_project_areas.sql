CREATE OR REPLACE FUNCTION martin_dynamic_project_areas(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_intersecting_area geometry;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_mvt ST_AsMVT(tile, 'dynamic_project_areas', 4096, 'geom') FROM (

    SELECT
      pa.id as "id",
      pa.scenario_id as "scenario_id",
      pa.name,
      COALESCE(pa.data, '{}'::jsonb) ->> 'treatment_rank' as "rank",
      ST_AsMVTGeom(
          ST_Transform(pa.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
    WHERE 
        pa.deleted_at is NULL AND
        pa.scenario_id = (query_params::jsonb)->>'scenario_id' AND
        pa.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269)
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;