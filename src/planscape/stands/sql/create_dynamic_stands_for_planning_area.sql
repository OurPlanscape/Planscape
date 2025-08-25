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
  lbl text := upper(size_label);
  xmin float8; ymin float8; xmax float8; ymax float8;
  snapped_env geometry;
BEGIN
  side_m := CASE lbl
              WHEN 'SMALL'  THEN 124.0806483
              WHEN 'MEDIUM' THEN 392.377463
              WHEN 'LARGE'  THEN 877.38267558
              ELSE NULL
            END;
  IF side_m IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'Unknown size ' || lbl;
  END IF;

  pa_5070 := ST_Transform(planning_area, 5070);

  xmin := ST_XMin(pa_5070); ymin := ST_YMin(pa_5070);
  xmax := ST_XMax(pa_5070); ymax := ST_YMax(pa_5070);

  snapped_env := ST_MakeEnvelope(
    origin_x + side_m * floor((xmin - origin_x)/side_m) - side_m,
    origin_y + side_m * floor((ymin - origin_y)/side_m) - side_m,
    origin_x + side_m * ceil ((xmax - origin_x)/side_m) + side_m,
    origin_y + side_m * ceil ((ymax - origin_y)/side_m) + side_m,
    5070
  );

  WITH hexes AS (
    SELECT geom FROM ST_HexagonGrid(side_m, snapped_env) AS g(geom)
  ),
  inside AS (
    SELECT h.geom
    FROM hexes h
    WHERE ST_Within(ST_PointOnSurface(h.geom), pa_5070)
  ),
  to_add AS (
    SELECT i.geom,
           (lbl || ':' ||
            round(ST_X(ST_PointOnSurface(i.geom))::numeric, 3)::text || ':' ||
            round(ST_Y(ST_PointOnSurface(i.geom))::numeric, 3)::text
           ) AS key
    FROM inside i
    LEFT JOIN public.stands_stand s0
      ON s0.size = lbl
     AND ST_Contains(
           s0.geometry,
           ST_Transform(ST_PointOnSurface(i.geom), 4269)
         )
    WHERE s0.id IS NULL
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

