CREATE OR REPLACE FUNCTION martin_stands_by_scenario(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_stand_size varchar;
BEGIN

  -- Fetch the scenario's stand_size from its configuration
  SELECT INTO p_stand_size (
    SELECT (configuration->>'stand_size')::varchar
    FROM planning_scenario
    WHERE id = (query_params->>'scenario_id')::int
  );

  -- Subselect project area geometries associated with the scenario
  WITH resumed_project_area AS (
    SELECT
      pa.id AS "id",
      pa.name AS "name",
      pa.geometry AS "geometry"
    FROM planning_projectarea pa
    LEFT JOIN planning_scenario sc ON pa.scenario_id = sc.id
    WHERE pa.scenario_id = (query_params->>'scenario_id')::int
      AND pa.deleted_at IS NULL
  )
  -- Build MVT tile
  SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_scenario', 4096, 'geom')
  FROM (
    SELECT
      ss.id AS "id",
      ss.size AS "stand_size",
      rpa.id AS "project_area_id",
      rpa.name AS "project_area_name",
      ST_AsMVTGeom(
        ST_Transform(ss.geometry, 3857),
        ST_TileEnvelope(z, x, y),
        4096, 64, true
      ) AS geom
    FROM stands_stand ss
    INNER JOIN resumed_project_area rpa
      ON ss.geometry && rpa.geometry
     AND ST_Within(ST_Centroid(ss.geometry), rpa.geometry)
    WHERE
      ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => 64.0 / 4096), 4269)
      AND ss.size = p_stand_size
  ) AS tile
  WHERE geom IS NOT NULL;

  RETURN p_mvt;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
