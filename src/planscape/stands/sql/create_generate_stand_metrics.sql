CREATE OR REPLACE FUNCTION generate_stand_metrics(_condition_id INT, _clean bool)
RETURNS VOID as $$
DECLARE
    raster_geometry geometry;
	stand record;
	stats stand_stats%rowtype;
	my_timestamp timestamp := timezone('utc', now());
BEGIN

    IF _clean THEN
        DELETE FROM stands_standmetric WHERE condition_id = condition_id;
    END IF;

	raster_geometry := (SELECT
                            st_transform(ST_Envelope(ST_Collect(ST_Envelope(raster))), 4269) 
                        FROM
					        conditions_conditionraster cc 
                        WHERE 
                            condition_id = _condition_id
					    GROUP BY
                            condition_id);
	

	FOR stand IN
		SELECT
            *
        FROM stands_stand
        WHERE 
            ss.geometry && raster_geometry AND
            ST_Intersects(ss.geometry, raster_geometry)
	LOOP
		stats := compute_stand_stats(stand.id, _condition_id);

        insert into stands_standmetric (
            created_at,
            min,
            avg,
            max,
            sum,
            count,
            condition_id,
            stand_id
        ) values (
            my_timestamp,
            stats.min,
            stats.avg,
            stats.max,
            stats.sum,
            stats.count,
            stats.condition_id,
            stats.stand_id
        );
	end loop;
end
$$ language plpgsql;