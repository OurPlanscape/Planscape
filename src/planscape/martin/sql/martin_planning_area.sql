CREATE OR REPLACE FUNCTION martin_planning_area(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
BEGIN

  WITH base AS (
    SELECT
      pa.id AS "id",
      ST_Transform(pa.geometry, 3857) AS geom
    FROM planning_planningarea pa
    WHERE
      pa.deleted_at IS NULL AND
      pa.id = (query_params->>'id')::int AND
      pa.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269)
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
  SELECT INTO p_mvt ST_AsMVT(mvt.*, 'planning_area')
  FROM mvt;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
