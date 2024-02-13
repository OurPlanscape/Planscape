select
	'LARGE' as stand_size,
	AVG(task_duration) as avg_duration,
	MAX(task_duration) as max_duration,
	percentile_cont(0.5) within group (
		order by
			task_duration
	) as p50,
	percentile_cont(0.9) within group (
		order by
			task_duration
	) as p90
from
	(
		select
			cast(completed_at - started_at as interval) as task_duration
		from
			planning_scenario as ps
			join planning_scenarioresult as psr on ps.id = psr.scenario_id
		where
			jsonb_extract_path_text (configuration, 'stand_size') = 'LARGE'
			and psr.status = 'SUCCESS'
	) as small_durations
UNION
select
	'MEDIUM' as stand_size,
	AVG(task_duration) as avg_duration,
	MAX(task_duration) as max_duration,
	percentile_cont(0.5) within group (
		order by
			task_duration
	) as p50,
	percentile_cont(0.9) within group (
		order by
			task_duration
	) as p90
from
	(
		select
			cast(completed_at - started_at as interval) as task_duration
		from
			planning_scenario as ps
			join planning_scenarioresult as psr on ps.id = psr.scenario_id
		where
			jsonb_extract_path_text (configuration, 'stand_size') = 'MEDIUM'
			and psr.status = 'SUCCESS'
	) as medium_durations
UNION
select
	'SMALL' as stand_size,
	AVG(task_duration) as avg_duration,
	MAX(task_duration) as max_duration,
	percentile_cont(0.5) within group (
		order by
			task_duration
	) as p50,
	percentile_cont(0.9) within group (
		order by
			task_duration
	) as p90
from
	(
		select
			cast(completed_at - started_at as interval) as task_duration
		from
			planning_scenario as ps
			join planning_scenarioresult as psr on ps.id = psr.scenario_id
		where
			jsonb_extract_path_text (configuration, 'stand_size') = 'SMALL'
			and psr.status = 'SUCCESS'
	) as small_durations
order by
	max_duration;