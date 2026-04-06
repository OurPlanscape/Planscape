CREATE OR REPLACE FUNCTION martin_sub_units_by_scenario( 
    z integer,
    x integer,
    y integer,
    query_params json
)
RETURNS bytea AS $$

DECLARE
    p_scenario_id integer := (query_params->>'scenario_id')::int;
    p_scenario_result_status varchar;
    p_planning_approach varchar;
    p_max_number_of_features integer;
    dyn_table text;
    tile bytea;
BEGIN

    SELECT INTO 
        p_scenario_id
        (query_params->>'scenario_id')::int;

    IF p_scenario_id IS NULL THEN
        RAISE EXCEPTION 'Scenario ID is required';
    END IF;

    SELECT result_status, planning_approach
        INTO p_scenario_result_status, p_planning_approach
    FROM planning_scenario sc
    WHERE sc.id = p_scenario_id;

    IF p_scenario_result_status != 'SUCCESS' THEN
        RAISE EXCEPTION 'Scenario result status must be SUCCESS';
    END IF;

    IF planning_approach != 'PRIORITIZE_SUB_UNITS' THEN
        RAISE EXCEPTION 'Scenario planning approach must be PRIORITIZE_SUB_UNITS';
    END IF;

    SELECT INTO
        p_max_number_of_features
        (query_params->>'number_of_features')::int;

    IF p_max_number_of_features IS NULL THEN
        p_max_number_of_features 10;
    END IF;

    SELECT (COALESCE(scenario.configuration, '{}'::jsonb) ->> 'sub_units_layer')::int
        INTO layer_id
        FROM public.planning_scenario scenario
    WHERE id = p_scenario_id;

    SELECT "table"
        INTO dyn_table
        FROM public.datasets_datalayer
    WHERE id = layer_id;

    EXECUTE format($f$
        WITH base AS (
            SELECT
                pa.id as "id",
                pa.scenario_id::int as "scenario_id",
                pa.name,
                (COALESCE(pa.data, '{}'::jsonb) ->> 'treatment_rank')::int as "rank",
                (COALESCE(pa.data, '{}'::jsonb) ->> 'proj_id')::int as "proj_id"
            FROM planning_projectarea pa
            WHERE 
                pa.deleted_at is NULL AND
                pa.scenario_id = p_scenario_id
        ), mvtpoly AS (
            SELECT
                id,
                scenario_id,
                name,
                rank,
                proj_id
            FROM base
            WHERE geom IS NOT NULL AND rank <= p_max_number_of_features
        ),
        bbox AS (
            SELECT ST_TileEnvelope($1, $2, $3, margin => (64.0/4096)) AS geom
        ),
        mvtgeom AS (
            SELECT
                t.id as id,
                mvtpoly.scenario_id,
                mvtpoly.rank,
                mvtpoly.proj_id,
                ST_AsMVTGeom(
                    ST_Transform(t.geometry, 3857),
                    ST_TileEnvelope($1, $2, $3),
                    4096, 64, true
                ) AS geom
            FROM %I.%I AS t, bbox
            INNER JOIN mvtpoly AS mvtpoly ON mvtpoly.proj_id = t.id
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