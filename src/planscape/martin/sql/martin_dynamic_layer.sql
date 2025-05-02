CREATE OR REPLACE FUNCTION martin_dynamic_layer( 
    z integer,
    x integer,
    y integer,
    query_params json
)
RETURNS bytea AS $$

DECLARE
    layer_id integer := (query_params->>'layer')::int;
    dyn_table text;
    tile bytea;
BEGIN
    SELECT "table"
        INTO dyn_table
        FROM public.datasets_datalayer
    WHERE id = layer_id;

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
            FROM %I.%I AS t, bbox
            WHERE t.geometry && ST_Transform(bbox.geom, ST_SRID(t.geometry))
        )
        SELECT ST_AsMVT(mvtgeom.*, %L, 4096, 'geom')
        FROM mvtgeom;
    $f$,
        split_part(dyn_table, '.', 1),
        split_part(dyn_table, '.', 2),
        format('dynamic_%s', layer_id)
    )
    INTO tile
    USING z, x, y;

    RETURN tile;
END;

$$ LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE;