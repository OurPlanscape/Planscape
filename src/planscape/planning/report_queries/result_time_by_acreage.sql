SELECT
   jsonb_extract_path_text(configuration, 'stand_size') as stand_size,
    AVG(CAST(completed_at - started_at AS INTERVAL)) AS avg_task_duration,
    avg(ST_Area(ST_Transform(pa.geometry, 32615))) AS avg_acreage,
    ROUND(avg(ST_Area(ST_Transform(pa.geometry, 32615))) 
    /     (AVG(EXTRACT(EPOCH FROM completed_at - started_at)) / 60)) 
    as acres_minute
FROM
    planning_scenario AS ps
    JOIN planning_scenarioresult AS psr ON ps.id = psr.scenario_id
    JOIN planning_planningarea AS pa ON pa.id = ps.planning_area_id
WHERE
    jsonb_extract_path_text(configuration, 'stand_size') IN ('SMALL', 'MEDIUM', 'LARGE')
GROUP BY
    stand_size
  order by acres_minute;
