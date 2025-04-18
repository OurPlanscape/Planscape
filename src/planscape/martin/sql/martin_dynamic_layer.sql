CREATE OR REPLACE FUNCTION martin_dynamic_layer(
    z integer,
    x integer,
    y integer,
    query_params json
)
RETURNS bytea AS $$

DECLARE
    layer_id integer := (query_params->>'layer')::int;
    dyn_table    text;
    tile        bytea;
BEGIN
    SELECT "table"
        INTO dyn_table
        FROM public.datasets_datalayer
    WHERE id = layer_id;
    
    IF dyn_table IS NULL THEN    
        RAISE EXCEPTION 'Datalayer with id % not found or has no table defined', layer_id;
    END IF;

    EXECUTE format($f$
        WITH
        bbox AS (
          SELECT ST_TileEnvelope($1, $2, $3, margin => (64.0/4096)) AS geom
        ),
        mvtgeom AS (
          SELECT
            t.id AS id,  
            ST_AsMVTGeom(
              ST_Transform(t.geometry, 3857),
              ST_TileEnvelope($1, $2, $3),
              4096, 64, true
            ) AS geom
          FROM %I AS t, bbox
          WHERE t.geometry && ST_Transform(bbox.geom, ST_SRID(t.geometry))
        )
        SELECT ST_AsMVT(mvtgeom.*, %L, 4096, 'geom')
        FROM mvtgeom;
    $f$, dyn_table, format('dynamic_%s', layer_id))
    INTO tile
    USING z, x, y;
    RETURN tile;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'martin_dynamic_layer(%): %', layer_id, SQLERRM;

    RETURN (
      WITH empty AS (
        SELECT NULL::integer AS id, NULL::geometry AS geom
        WHERE FALSE
      )
      SELECT ST_AsMVT(empty, format('dynamic_%s', layer_id), 4096, 'geom')
      FROM empty
    );

END; 

$$ LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE;
