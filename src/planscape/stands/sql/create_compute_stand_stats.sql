CREATE OR REPLACE FUNCTION compute_stand_stats(stand_id integer, condition_id int)
  RETURNS TABLE (
  	id 	   integer,
    minval float,
    maxval float,
    avgval float,
    sum    float,
    count  integer
  ) AS $$

  WITH stand AS (SELECT 
  					id,
  					ST_Transform(ss.geometry, 3857) AS geometry
	             FROM stands_stand ss
                 WHERE id = stand_id),

  stats AS (SELECT 
  			s.id as "stand_id",
  			(ST_SummaryStats(ST_Clip(cc.raster, s.geometry, FALSE))).*
            FROM conditions_conditionraster cc, stand s
            WHERE 
        	 	cc.condition_id = condition_id AND
				s.geometry && cc.raster AND
				ST_Intersects(s.geometry, cc.raster))

  SELECT stand_id,
  		 min(ss.min) AS minval,
         max(ss.max) AS maxval,
         sum(ss.mean * ss.count)/sum(ss.count) AS avgval,
         sum(ss.sum) AS sum,
         sum(ss.count) AS count
  FROM stats ss
  group by stand_id

$$ LANGUAGE SQL;