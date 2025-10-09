CREATE OR REPLACE FUNCTION public.generate_stands_for_planning_area(
  planning_area_id int,
  planning_area geometry,
  size_label text
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  pa_5070 geometry;
  old_planning_areas geometry;
  remaining_planning_area geometry;
  side_m float8;
  inserted integer := 0;
  stand_size text := upper(size_label);
  envelope geometry;
BEGIN
  side_m := CASE stand_size
              WHEN 'SMALL'  THEN 124.0806483
              WHEN 'MEDIUM' THEN 392.377463
              WHEN 'LARGE'  THEN 877.38267558
              ELSE NULL
            END;
  IF side_m IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'Unknown size ' || lbl;
  END IF;

  SELECT 
    ST_Union(geometry) 
  INTO
    old_planning_areas
  FROM
    planning_planningarea pa
  WHERE
    id <> planning_area_id AND
    deleted_at IS NULL AND
    planning_area && pa.geometry AND
    ST_Intersects(planning_area, pa.geometry);

  SELECT ST_Difference(planning_area, old_planning_areas) INTO remaining_planning_area;

  IF ST_IsEmpty(remaining_planning_area) THEN
    RAISE NOTICE 'Empty remaining planning area, no stands to calculate.';
    RETURN 0;
  END IF;

  pa_5070 := ST_Transform(remaining_planning_area, 5070);
  envelope := ST_Envelope(pa_5070);

  WITH hexes AS (
    SELECT 
      geom, 
      ST_Centroid(geom) as "point",
      ST_Transform(ST_Centroid(geom), 4326) as "point_4326",
      ST_Transform(ST_Centroid(geom), 4269) as "point_4269"
    FROM ST_HexagonGrid(side_m, envelope) AS g(geom)
  ),
  inside AS (
    SELECT 
      h.geom,
      ST_GeoHash(h.point_4326, 8) as "geohash"
    FROM hexes h
    WHERE
      ST_Within(h.point, pa_5070)
      AND NOT EXISTS (
        SELECT 1 FROM
          stands_stand ss
        WHERE
          ss.size = stand_size AND
          remaining_planning_area && ss.geometry AND
          ST_Within(h.point_4269, ss.geometry)
      )
  )
  INSERT INTO public.stands_stand (created_at, size, geometry, area_m2, grid_key)
  SELECT 
    now(),
    stand_size,
    ST_Transform(t.geom, 4269),
    ROUND(ST_Area(t.geom)::numeric, 2),
    t.geohash
  FROM inside t
  ON CONFLICT ("size", "grid_key") DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;