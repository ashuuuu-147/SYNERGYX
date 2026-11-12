"""Test Alembic environment and metadata configuration."""

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.db.base import Base


def test_alembic_config_resolves():
    """Verify alembic.ini is present and can locate script directory."""
    config = Config("alembic.ini")
    script = ScriptDirectory.from_config(config)
    assert script is not None


def test_declarative_base_metadata_exists():
    """Verify Base declarative class exposes valid MetaData."""
    assert Base.metadata is not None
