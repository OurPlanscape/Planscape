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
    p_planning_area_id integer;
    p_layer_id integer;
    p_dyn_table text;
    tile bytea;
BEGIN

    SELECT INTO 
        p_scenario_id
        (query_params->>'scenario_id')::int;

    IF p_scenario_id IS NULL THEN
        RAISE EXCEPTION 'Scenario ID is required';
    END IF;

    SELECT result_status, planning_approach, planning_area_id
        INTO p_scenario_result_status, p_planning_approach, p_planning_area_id
    FROM planning_scenario sc
    WHERE sc.id = p_scenario_id;

    IF p_scenario_result_status != 'SUCCESS' THEN
        RAISE EXCEPTION 'Scenario result status must be SUCCESS';
    END IF;

    IF p_planning_approach != 'PRIORITIZE_SUB_UNITS' THEN
        RAISE EXCEPTION 'Scenario planning approach must be PRIORITIZE_SUB_UNITS';
    END IF;

    SELECT INTO
        p_max_number_of_features
        (query_params->>'number_of_features')::int;

    IF p_max_number_of_features IS NULL THEN
         SELECT INTO p_max_number_of_features 10;
    END IF;

    SELECT (COALESCE(scenario.configuration, '{}'::jsonb) ->> 'sub_units_layer')::int
        INTO p_layer_id
        FROM public.planning_scenario scenario
    WHERE id = p_scenario_id;

    SELECT "table"
        INTO p_dyn_table
        FROM public.datasets_datalayer
    WHERE id = p_layer_id;

    EXECUTE format($f$
        WITH planning_area AS (
            SELECT p.geometry AS geom
            FROM planning_planningarea p
            WHERE p.id = %L
        ),
        project_area AS (
            SELECT
                pa.id AS "pa_id",
                pa.scenario_id AS "scenario_id",
                pa.name,
                (COALESCE(pa.data, '{}'::jsonb) ->> 'treatment_rank')::int AS "rank",
                (COALESCE(pa.data, '{}'::jsonb) ->> 'proj_id')::int AS "proj_id",
                t.id AS "t_id",
                ST_Transform(
                    ST_Intersection(t.geometry, p.geom), 3857
                 ) AS geom
            FROM planning_projectarea pa
            INNER JOIN %I.%I AS t ON t.id = (COALESCE(pa.data, '{}'::jsonb) ->> 'proj_id')::int
            INNER JOIN planning_area p ON p.geom && t.geometry
            WHERE 
                pa.deleted_at is NULL AND
                pa.scenario_id = %L AND
                (pa.data->>'treatment_rank')::int <= %L
        ),
        mvtgeom AS (
            SELECT
                DISTINCT pa_id AS "id",
                scenario_id,
                name,
                rank,
                ST_AsMVTGeom(
                    pa.geom,
                    ST_TileEnvelope($1, $2, $3),
                    4096, 64, true
                ) AS geom
            FROM project_area pa
            WHERE pa.geom && ST_TileEnvelope($1, $2, $3, margin => (64.0 / 4096))
        ),
        mvtpoint AS (
            SELECT
                DISTINCT pa_id AS "id",
                scenario_id,
                name,
                rank,
                ST_AsMVTGeom(
                    ST_PointOnSurface(pa.geom),
                    ST_TileEnvelope($1, $2, $3),
                    4096, 64, true
                ) AS geom
            FROM project_area pa
            WHERE ST_PointOnSurface(pa.geom) && ST_TileEnvelope($1, $2, $3, margin => (64.0 / 4096))
        )
        SELECT 
            ST_AsMVT(mvtgeom.*, 'sub_units_by_scenario') || 
            ST_AsMVT(mvtpoint.*, 'sub_units_by_scenario_label')
        FROM mvtgeom, mvtpoint;
    $f$,
        p_planning_area_id,
        split_part(p_dyn_table, '.', 1),
        split_part(p_dyn_table, '.', 2),
        p_scenario_id,
        p_max_number_of_features
    )
    INTO tile
    USING z, x, y;

    RETURN tile;
END;

$$ LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE;
