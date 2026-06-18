CREATE OR REPLACE FUNCTION martin_scenario_treatable_area(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
BEGIN

  WITH base AS (
    SELECT
      s.id AS "id",
      ST_Transform(s.treatable_area, 3857) AS geom
    FROM planning_scenario s
    WHERE
      s.deleted_at IS NULL AND
      s.id = (query_params->>'id')::int AND
      s.treatable_area && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269)
  ), mvt AS (
    SELECT
      id,
      ST_AsMVTGeom(
        geom,
        ST_TileEnvelope(z, x, y),
        4096, 64, true
      ) AS geom
    FROM base
    WHERE geom IS NOT NULL
  )
  SELECT INTO p_mvt ST_AsMVT(mvt.*, 'treatable_area')
  FROM mvt;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
