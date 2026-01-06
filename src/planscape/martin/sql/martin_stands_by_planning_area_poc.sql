CREATE OR REPLACE FUNCTION martin_stands_by_planning_area_poc(
  z integer,
  x integer,
  y integer,
  query_params json
)

RETURNS bytea AS $$

DECLARE
  mvt bytea;
  stand_size text;
  planning_area_id int;
  exclusion_datalayer_id int;
  constraint_datalayer_id int;
  constraint_operator text;
  constraint_threshold double precision;

BEGIN
  stand_size := query_params->>'stand_size';
  planning_area_id := (query_params->>'planning_area_id')::int;
  exclusion_datalayer_id  := NULLIF(query_params->>'exclude_datalayer_id', '')::int;
  constraint_datalayer_id := NULLIF(query_params->>'constraint_datalayer_id', '')::int;
  constraint_operator     := NULLIF(query_params->>'constraint_operator', '');
  constraint_threshold    := NULLIF(query_params->>'constraint_value', '')::float8;

  WITH pa AS (
    SELECT geometry
    FROM planning_planningarea
    WHERE id = planning_area_id
  ),
  stands_in_pa_and_tile AS (
    SELECT ss.id, ss.size, ss.geometry
    FROM stands_stand ss
    JOIN pa
      ON ss.geometry && pa.geometry
     AND ST_Within(ST_Centroid(ss.geometry), pa.geometry)
    WHERE ss.size = stand_size
      AND ss.geometry && ST_Transform(
        ST_TileEnvelope(z, x, y, margin => (64.0 / 4096)),
        4269
      )
  ),
  tile AS (
    SELECT
      s.id,
      s.size AS stand_size,
      CASE
        WHEN exclusion_datalayer_id IS NOT NULL
         AND sm_ex.majority = 1
          THEN 'EXCLUDED'

        WHEN constraint_datalayer_id IS NOT NULL
         AND constraint_threshold IS NOT NULL
         AND constraint_operator IS NOT NULL
         AND (
              (constraint_operator = 'lt'  AND sm_co.avg <  constraint_threshold) OR
              (constraint_operator = 'lte' AND sm_co.avg <= constraint_threshold) OR
              (constraint_operator = 'gt'  AND sm_co.avg >  constraint_threshold) OR
              (constraint_operator = 'gte' AND sm_co.avg >= constraint_threshold) OR
              (constraint_operator = 'eq'  AND sm_co.avg =  constraint_threshold)
         )
          THEN 'CONSTRAINED'

        ELSE 'TREATABLE'
      END AS status,
      ST_AsMVTGeom(
        ST_Transform(s.geometry, 3857),
        ST_TileEnvelope(z, x, y),
        4096,
        64,
        true
      ) AS geom
    
    FROM stands_in_pa_and_tile s
    LEFT JOIN stands_standmetric sm_ex
      ON sm_ex.stand_id = s.id
     AND sm_ex.datalayer_id = exclusion_datalayer_id

    LEFT JOIN stands_standmetric sm_co
      ON sm_co.stand_id = s.id
     AND sm_co.datalayer_id = constraint_datalayer_id
  )
  SELECT INTO mvt
    ST_AsMVT(tile, 'stands_by_planning_area_poc', 4096, 'geom')
  FROM tile
  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql STABLE STRICT PARALLEL SAFE;
