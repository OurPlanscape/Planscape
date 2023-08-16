-- FIXME: Include a multiplier to convert the stand area to acres
CREATE OR REPLACE FUNCTION compute_stand_cost(_stand geometry(polygon), _cost_per_acre float)
  RETURNS float AS $$

  SELECT (_cost_per_acre * ST_Area(_stand)) AS stand_cost

$$ LANGUAGE SQL;

-- FIXME: Rewrite to plpgsql since you can't reference a table via a string name in SQL
CREATE OR REPLACE FUNCTION compute_raster_priority(_stand geometry(polygon), _raster_table text, _raster_weight float)
  RETURNS float AS $$

  SELECT (_raster_weight * (ST_SummaryStats(ST_Clip(ST_Union(rast), _stand, TRUE))).mean) AS raster_priority
  FROM _raster_table
  WHERE rast && _stand

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION compute_stand_priority(_stand geometry(polygon), _raster_tables text[], _raster_weights float[])
  RETURNS float AS $$

  SELECT sum(compute_raster_priority(_stand, _raster_tables[idx], _raster_weights[idx]) AS raster_priority) AS stand_priority
  FROM generate_series(1, array_length(_raster_tables)) AS idx

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION compute_stand_cost_and_priority(_stand geometry(polygon), _cost_per_acre float, _raster_tables text[], _raster_weights float[])
  RETURNS TABLE (
    stand_cost     float,
    stand_priority float
  ) AS $$

    SELECT compute_stand_cost(_stand, _cost_per_acre) AS stand_cost,
           compute_stand_priority(_stand, _raster_tables, _raster_weights) AS stand_priority

$$ LANGUAGE SQL;