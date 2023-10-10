DROP FUNCTION IF EXISTS generate_stand_metrics;
CREATE OR REPLACE FUNCTION generate_stand_metrics(_condition_id INT, _clean bool)
RETURNS VOID AS $$
DECLARE
    raster_geometry geometry;
    stand record;
    stats stand_stats%rowtype;
    my_timestamp timestamp := timezone('utc', now());
BEGIN
    IF _clean THEN
        DELETE FROM stands_standmetric WHERE condition_id = _condition_id;
    END IF;

    raster_geometry := (
        SELECT
            ST_Transform(ST_Envelope(ST_Collect(ST_Envelope(raster))), 4269)
        FROM
            conditions_conditionraster cc
        WHERE
            condition_id = _condition_id
    );

    FOR stand IN
        SELECT * FROM stands_stand ss
        WHERE
            ss.geometry && raster_geometry AND
            ST_Intersects(ss.geometry, raster_geometry)
    LOOP
        stats := compute_stand_stats(stand.id, _condition_id);

        IF stats.count > 0 THEN
            INSERT INTO stands_standmetric (
                created_at,
                min,
                avg,
                max,
                sum,
                count,
                condition_id,
                stand_id
            ) VALUES (
                my_timestamp,
                stats.min,
                stats.avg,
                stats.max,
                stats.sum,
                stats.count,
                stats.condition_id,
                stats.stand_id
            );
        END IF;
    END LOOP;
END
$$ LANGUAGE plpgsql;