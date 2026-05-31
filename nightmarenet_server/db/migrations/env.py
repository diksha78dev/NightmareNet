"""Alembic migration environment.

Loads metadata from :mod:`nightmarenet_server.models` and honours the
``NIGHTMARENET_DATABASE_URL`` environment variable, falling back to the URL
configured in ``alembic.ini`` for local development.

Alembic itself is an optional dependency for the hosted platform; this file
is only executed by the ``alembic`` CLI, never on package import, so the
open-source core is unaffected.
"""

import os
from logging.config import fileConfig
from typing import Optional

from alembic import context
from sqlalchemy import engine_from_config, pool

from nightmarenet_server.models import Base
from nightmarenet_server.models import tables as _tables  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _resolve_database_url() -> str:
    """Return the database URL, preferring the env var."""
    env_url: Optional[str] = os.environ.get("NIGHTMARENET_DATABASE_URL")
    if env_url:
        return env_url
    ini_url: Optional[str] = config.get_main_option("sqlalchemy.url")
    if ini_url:
        return ini_url
    return "sqlite:///./nightmarenet_hosted.db"


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB engine, emits SQL only)."""
    url = _resolve_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=url.startswith("sqlite"),
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against a live connection."""
    url = _resolve_database_url()
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = url

    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=url.startswith("sqlite"),
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
