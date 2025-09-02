CREATE OR REPLACE FUNCTION public.generate_stands_for_planning_area(
  planning_area geometry,
  size_label text,
  origin_x double precision,
  origin_y double precision
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  pa_5070 geometry;
  side_m float8;
  inserted integer := 0;
  stand_size text := upper(size_label);
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

  pa_5070 := ST_Envelope(ST_Transform(planning_area, 5070));

  WITH hexes AS (
    SELECT 
      geom, 
      ST_Centroid(geom) as "point", 
      ST_Transform(ST_Centroid(geom), 4326) as "point_4326" 
    FROM ST_HexagonGrid(side_m, snapped_env) AS g(geom)
  ),
  inside AS (
    SELECT h.geom, h.point
    FROM hexes h
    WHERE ST_Within(h.point, pa_5070)
  ),
  to_add AS (
    SELECT i.geom,
           i.point_4326,
           ST_GeoHash(i.point_4326, 8) AS key
    FROM inside i
  )
  INSERT INTO public.stands_stand (created_at, size, geometry, area_m2, grid_key)
  SELECT now(),
         lbl,
         ST_Transform(t.geom, 4269),
         ROUND(ST_Area(t.geom)::numeric, 2),
         t.key
  FROM to_add t
  ON CONFLICT (grid_key) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

