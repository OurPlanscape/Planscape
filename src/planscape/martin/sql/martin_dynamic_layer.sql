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
    info_value jsonb;
    datalayer_key text;
    properties text;
    tile bytea;
BEGIN
    SELECT "table", "info"
        INTO dyn_table, info_value
        FROM public.datasets_datalayer
    WHERE id = layer_id;

    SELECT jsonb_object_keys(info_value)
        INTO datalayer_key
    LIMIT 1;
	
    WITH prop_keys_table AS (
        SELECT jsonb_object_keys(info_value->datalayer_key->'schema'->'properties') as keys
    )
    SELECT string_agg(lower(prop_keys_table.keys), ', ') INTO properties FROM prop_keys_table;

    EXECUTE format($f$
        WITH
        bbox AS (
            SELECT ST_TileEnvelope($1, $2, $3, margin => (64.0/4096)) AS geom
        ),
        mvtgeom AS (
            SELECT
                t.id as id,
                %s,
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
        properties,
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