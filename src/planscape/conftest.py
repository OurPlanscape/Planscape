"""
Test database setup mirroring ``manage.py test --parallel``.

By default pytest-django migrates a separate database inside every xdist
worker. Planscape has hundreds of migrations, many of them seeding data, so
instead the controller migrates a single template database once and clones it
for each worker (``CREATE DATABASE ... TEMPLATE``), like Django's runner does.

Databases are created without serialization, so ``serialized_rollback`` is not
supported.
"""

from typing import Generator

import pytest
from django.db import connections
from django.test.utils import setup_databases, teardown_databases
from pytest_django.plugin import blocking_manager_key

db_config_key = pytest.StashKey[list]()


def _worker_count(config: pytest.Config) -> int:
    return getattr(config.option, "numprocesses", None) or 0


def _keepdb(config: pytest.Config) -> bool:
    return bool(config.getvalue("reuse_db") and not config.getvalue("create_db"))


def pytest_sessionstart(session: pytest.Session) -> None:
    # Runs before xdist spawns its workers (xdist's hook is trylast).
    config = session.config
    if hasattr(config, "workerinput") or config.option.collectonly:
        return

    verbosity = config.option.verbose
    parallel = _worker_count(config)
    with config.stash[blocking_manager_key].unblock():
        db_config = setup_databases(
            verbosity=verbosity,
            interactive=False,
            keepdb=_keepdb(config),
            serialized_aliases=set(),
        )
        if parallel > 1:
            for connection, _, destroy in db_config:
                if not destroy:
                    continue
                for index in range(parallel):
                    # Always re-clone, so --reuse-db clones pick up new migrations.
                    connection.creation.clone_test_db(
                        suffix=str(index + 1),
                        verbosity=verbosity,
                        keepdb=False,
                    )
    connections.close_all()
    config.stash[db_config_key] = db_config


def pytest_unconfigure(config: pytest.Config) -> None:
    db_config = config.stash.get(db_config_key, None)
    if db_config is None:
        return

    with config.stash[blocking_manager_key].unblock():
        teardown_databases(
            db_config,
            verbosity=config.option.verbose,
            parallel=_worker_count(config),
            keepdb=_keepdb(config),
        )


@pytest.fixture(scope="session")
def django_db_setup(
    request: pytest.FixtureRequest,
    django_test_environment: None,
) -> Generator[None, None, None]:
    """Point each xdist worker at its clone of the template database."""
    workerinput = getattr(request.config, "workerinput", None)
    if workerinput is not None:
        suffix = str(int(workerinput["workerid"].removeprefix("gw")) + 1)
        for connection in connections.all():
            connection.settings_dict["NAME"] = connection.creation._get_test_db_name()
            if workerinput["workercount"] > 1:
                connection.settings_dict.update(
                    connection.creation.get_test_db_clone_settings(suffix)
                )
            connection.close()

    yield

    connections.close_all()
