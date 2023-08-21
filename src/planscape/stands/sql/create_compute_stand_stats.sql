CREATE TYPE stand_stats AS (
    stand_id     BIGINT,
    condition_id BIGINT,
    min          DOUBLE precision,
    avg          DOUBLE precision,
    max          DOUBLE precision,
    SUM          double precision,
    count        BIGINT
);

CREATE OR REPLACE FUNCTION compute_stand_stats(stand_id INT, condition_id INT)
  RETURNS stand_stats AS $$

    WITH stand AS (
      SELECT 
        id,
        ST_Transform(ss.geometry, 3857) AS geometry
      FROM stands_stand ss
      WHERE
        id = stand_id
    ),

    stats AS (
      SELECT 
        row_number() OVER (ORDER BY s.id) AS id,
        s.id AS "stand_id",
        (ST_SummaryStats(ST_Clip(cc.raster, s.geometry))).*
      FROM conditions_conditionraster cc, stand s
      WHERE 
        cc.condition_id = condition_id AND
        s.geometry && cc.raster AND
        ST_Intersects(s.geometry, cc.raster)
    )

    SELECT stand_id,
      condition_id,
      min(ss.min) AS min,
      max(ss.max) AS max,
      sum(ss.mean * ss.count)/sum(ss.count) AS avg,
      sum(ss.sum) AS sum,
      sum(ss.count) AS count
    FROM 
      stats ss
    GROUP BY
      stand_id

$$ LANGUAGE sql
IMMUTABLE
PARALLEL SAFE;