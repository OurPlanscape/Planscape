WITH durations AS (
	SELECT
		*,
		CASE
			WHEN configuration ->> 'stand_size' = 'LARGE' THEN 'LARGE'
			WHEN configuration ->> 'stand_size' = 'MEDIUM' THEN 'MEDIUM'
			ELSE 'SMALL'
		END AS st_size,
		cast(completed_at - started_at as interval) as task_duration,
		jsonb_extract_path_text(configuration, 'stand_size') as stand_size
	from
		planning_scenario as ps
		join planning_scenarioresult as psr on ps.id = psr.scenario_id
	where
		psr.status = 'SUCCESS'
)
SELECT
	stand_size,
	date_trunc('second', AVG(task_duration)) as avg_duration,
	percentile_cont(0.5) within group (
		order by
			task_duration
	) as p50,
	percentile_cont(0.9) within group (
		order by
			task_duration
	) as p90,
	MAX(task_duration) as max_duration
FROM
	durations
GROUP BY
	stand_size
order by stand_size
