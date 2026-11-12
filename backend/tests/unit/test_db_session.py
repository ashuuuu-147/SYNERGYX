"""Test database session lifecycle and dependency behavior."""

import contextlib

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db


def test_session_lifecycle_yields_and_closes():
    """Verify get_db generator yields a session and closes cleanly."""
    gen = get_db()
    session = next(gen)
    assert session is not None
    assert session.is_active

    # Closing generator should trigger the finally block
    with contextlib.suppress(StopIteration):
        next(gen)


def test_transaction_rollback_on_error():
    """Verify session rollback cleans up on uncommitted error."""
    test_engine = create_engine("sqlite:///:memory:")
    TestSession = sessionmaker(bind=test_engine)

    with test_engine.connect() as conn:
        conn.execute(text("CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT)"))
        conn.commit()

    session = TestSession()
    try:
        session.execute(text("INSERT INTO test_items (id, name) VALUES (1, 'item1')"))
        # Simulate exception before commit
        raise RuntimeError("Simulated failure")
    except RuntimeError:
        session.rollback()
    finally:
        session.close()

    # Verify record was rolled back
    verify_session = TestSession()
    result = verify_session.execute(text("SELECT count(*) FROM test_items")).scalar()
    verify_session.close()
    assert result == 0
