CREATE OR REPLACE FUNCTION martin_dynamic_layer(
    z integer,
    x integer,
    y integer,
    query_params json
)
RETURNS bytea AS $$

DECLARE
    layer_name text := query_params->>'layer';
    sql         text;
    tile        bytea;
BEGIN
    IF layer_name !~ '^[a-zA-Z0-9_\.]+$' THEN
        RAISE EXCEPTION 'Invalid layer name %', layer_name;
    END IF;

    sql := format($f$
        WITH
        bbox AS (
          SELECT ST_TileEnvelope(%1$s, %2$s, %3$s, margin => (64.0/4096)) AS geom
        ),
        mvtgeom AS (
          SELECT
            t.id AS id,  
            ST_AsMVTGeom(
              ST_Transform(t.geometry, 3857),
              ST_TileEnvelope(%1$s, %2$s, %3$s),
              4096, 64, true
            ) AS geom
          FROM %4$I AS t, bbox
          WHERE
            t.geometry && ST_Transform(bbox.geom, ST_SRID(t.geometry))
        )
        SELECT ST_AsMVT(mvtgeom.*, 'dynamic_layer', 4096, 'geom')
        FROM mvtgeom;
    $f$, z, x, y, layer_name);

    EXECUTE sql INTO tile;
    RETURN tile;
END; 

$$ LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE;
