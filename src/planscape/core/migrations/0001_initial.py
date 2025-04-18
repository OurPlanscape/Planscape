from django.db import migrations

ALTER_SYSTEM = """
ALTER SYSTEM SET
 max_connections = '160';
ALTER SYSTEM SET
 shared_buffers = '4GB';
ALTER SYSTEM SET
 effective_cache_size = '8GB';
ALTER SYSTEM SET
 maintenance_work_mem = '1GB';
ALTER SYSTEM SET
 checkpoint_completion_target = '0.9';
ALTER SYSTEM SET
 wal_buffers = '16MB';
ALTER SYSTEM SET
 default_statistics_target = '100';
ALTER SYSTEM SET
 random_page_cost = '1.1';
ALTER SYSTEM SET
 effective_io_concurrency = '200';
ALTER SYSTEM SET
 work_mem = '6553kB';
ALTER SYSTEM SET
 huge_pages = 'off';
ALTER SYSTEM SET
 min_wal_size = '1GB';
ALTER SYSTEM SET
 max_wal_size = '4GB';
ALTER SYSTEM SET
 max_worker_processes = '8';
ALTER SYSTEM SET
 max_parallel_workers_per_gather = '4';
ALTER SYSTEM SET
 max_parallel_workers = '8';
ALTER SYSTEM SET
 max_parallel_maintenance_workers = '4';
"""


class Migration(migrations.Migration):
    dependencies = []

    operations = [migrations.RunSQL(ALTER_SYSTEM)]
