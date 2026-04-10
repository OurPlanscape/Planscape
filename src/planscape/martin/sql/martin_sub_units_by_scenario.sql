CREATE OR REPLACE FUNCTION private_sub_units_by_polygon(
    in_geometry geometry,
    dyn_table TEXT
)
RETURNS TABLE (id BIGINT, geom geometry)
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
AS $$
DECLARE
    schema_name TEXT;
    table_name  TEXT;
BEGIN
    schema_name := split_part(dyn_table, '.', 1);
    table_name  := split_part(dyn_table, '.', 2);

    RETURN QUERY EXECUTE format($f$
        SELECT
            subunit.id,
            subunit.geometry AS geom
        FROM %I.%I AS subunit
        WHERE $1 && subunit.geometry
          AND ST_Intersects($1, subunit.geometry)
    $f$, schema_name, table_name)
    USING in_geometry;
END;
$$;


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
    p_planning_area_geom geometry;
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

    SELECT p.geometry AS geom
        INTO p_planning_area_geom
    FROM planning_planningarea p
    WHERE p.id = p_planning_area_id;

    WITH subunits AS (
        SELECT * 
        FROM private_sub_units_by_polygon(p_planning_area_geom, p_dyn_table)
    ),
    project_area AS (
        SELECT
            pa.id AS "pa_id",
            pa.scenario_id AS "scenario_id",
            pa.name,
            (COALESCE(pa.data, '{}'::jsonb) ->> 'treatment_rank')::int AS "rank",
            (COALESCE(pa.data, '{}'::jsonb) ->> 'proj_id')::int AS "proj_id",
            ST_Transform(
                ST_Intersection(su.geom, p_planning_area_geom), 3857
            ) AS geom
        FROM planning_projectarea pa
        INNER JOIN subunits su ON su.id = (pa.data->>'proj_id')::int
        WHERE 
            pa.deleted_at is NULL AND
            pa.scenario_id = p_scenario_id AND
            (pa.data->>'treatment_rank')::int <= p_max_number_of_features
    ),
    mvtgeom AS (
        SELECT
            DISTINCT pa_id AS "id",
            scenario_id,
            name,
            rank,
            ST_AsMVTGeom(
                pa.geom,
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM project_area pa
        WHERE pa.geom && ST_TileEnvelope(z, x, y, margin => (64.0 / 4096))
    ),
    mvtpoint AS (
        SELECT
            DISTINCT pa_id AS "id",
            scenario_id,
            name,
            rank,
            ST_AsMVTGeom(
                ST_PointOnSurface(pa.geom),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM project_area pa
        WHERE ST_PointOnSurface(pa.geom) && ST_TileEnvelope(z, x, y, margin => (64.0 / 4096))
    )
    SELECT INTO tile (
        (SELECT ST_AsMVT(mvtgeom.*, 'sub_units_by_scenario') FROM mvtgeom WHERE geom IS NOT NULL) || 
        (SELECT ST_AsMVT(mvtpoint.*, 'sub_units_by_scenario_label') FROM mvtpoint WHERE geom IS NOT NULL)
    );

    RETURN tile;

END $$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
