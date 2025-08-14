CREATE OR REPLACE FUNCTION martin_stands_by_scenario(z integer, x integer, y integer, query_params json)
RETURNS bytea AS $$
DECLARE
  p_mvt bytea;
  p_stand_size varchar;
BEGIN

  SELECT INTO p_stand_size (
    SELECT (configuration->>'stand_size')::varchar FROM planning_scenario sc
    WHERE sc.id = (query_params->>'scenario_id')::int
  );

  WITH planning_area_geom AS (
    SELECT 
      pa.geometry AS "geometry"
    FROM 
      planning_planningarea pa
    LEFT JOIN planning_scenario sc ON (sc.planning_area_id = pa.id)
    WHERE 
      sc.id = (query_params->>'scenario_id')::int
  )SELECT INTO p_mvt ST_AsMVT(tile, 'stands_by_scenario', 4096, 'geom') FROM (

    SELECT
      ss.id as "id",
      ss.size as "stand_size",
      ST_AsMVTGeom(
          ST_Transform(ss.geometry, 3857),
          ST_TileEnvelope(z, x, y),
          4096, 64, true) AS geom
    FROM stands_stand ss
    INNER JOIN planning_area_geom pag ON ss.geometry && pag.geometry AND
                                         ST_Within(ST_Centroid(ss.geometry), pag.geometry)
    WHERE 
        ss.geometry && ST_Transform(ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)), 4269) AND
        ss.size = p_stand_size
  ) as tile WHERE geom IS NOT NULL;

  RETURN p_mvt;
END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
