CREATE OR REPLACE FUNCTION create_stands(
		extent geometry,
		hex_length float,
		size_indicator varchar,
		clean bool
	) RETURNS int AS $$
DECLARE
	my_timestamp timestamp := timezone('utc', now());
BEGIN
	IF clean THEN
		DELETE FROM stands_stand ss
		WHERE size = size_indicator;
	END IF;

	INSERT INTO stands_stand (created_at, size, geometry, area_m2) (
		SELECT
			my_timestamp AS "created_at",
			size_indicator AS "size",
			ST_Transform(hex.geom, 4269) AS "geometry",
			ROUND(ST_Area(hex.geom)::numeric, 2) AS "area_m2"
		FROM
			ST_HexagonGrid(hex_length, extent) AS hex
	);
	RETURN (
		SELECT count(*)
		FROM stands_stand ss
		WHERE size = size_indicator
	);
END;
$$ LANGUAGE plpgsql;