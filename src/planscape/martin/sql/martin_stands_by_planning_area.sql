CREATE OR REPLACE FUNCTION martin_stands_by_planning_area(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_stand_size varchar;
BEGIN
  p_stand_size := query_params->>'stand_size';

  WITH planning_area_geom AS (
    SELECT pa.geometry AS "geometry"
    FROM planning_planningarea pa
    WHERE pa.id = (query_params->>'planning_area_id')::int
  )
  SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_planning_area', 4096, 'geom')
  FROM (
    SELECT
      ss.id AS "id",
      ss.size AS "stand_size",
      ST_AsMVTGeom(
        ST_Transform(ss.geometry, 3857),
        ST_TileEnvelope(z, x, y),
        4096, 64, true
      ) AS geom
    FROM stands_stand ss
    INNER JOIN planning_area_geom pag
      ON ss.geometry && pag.geometry
     AND ST_Within(ST_Centroid(ss.geometry), pag.geometry)
    WHERE
      ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269)
      AND ss.size = p_stand_size
  ) AS tile
  WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
