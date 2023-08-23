DROP FUNCTION IF EXISTS compute_stand_stats;
DROP TYPE IF EXISTS stand_stats;
CREATE TYPE stand_stats AS (
    stand_id     BIGINT,
    condition_id BIGINT,
    min          DOUBLE PRECISION,
    avg          DOUBLE PRECISION,
    max          DOUBLE PRECISION,
    SUM          DOUBLE PRECISION,
    count        BIGINT
);

CREATE OR REPLACE FUNCTION compute_stand_stats(_stand_id BIGINT, _condition_id INT)
  RETURNS stand_stats AS $$

    WITH stand AS (
      SELECT
        id,
        ST_Transform(ss.geometry, 3857) AS geometry
      FROM stands_stand ss
      WHERE
        id = _stand_id
    ),

    stats AS (
      SELECT
        s.id AS "stand_id",
        (ST_SummaryStats(ST_Clip(cc.raster, s.geometry))).*
      FROM conditions_conditionraster cc, stand s
      WHERE
        cc.condition_id = _condition_id AND
        s.geometry && cc.raster AND
        ST_Intersects(s.geometry, cc.raster)
      ORDER BY
        s.id
    )

    SELECT 
      stand_id,
      _condition_id,
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