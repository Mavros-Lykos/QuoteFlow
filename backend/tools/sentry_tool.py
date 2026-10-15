import os
import time
from contextlib import contextmanager
from typing import Any, Dict, Optional

_initialized = False


def init_sentry() -> bool:
    global _initialized
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn or _initialized:
        return bool(dsn and _initialized)
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=1.0,
            profiles_sample_rate=0.0,
            environment=os.getenv("SENTRY_ENVIRONMENT", "quoteflow"),
        )
        _initialized = True
        return True
    except Exception as e:
        print(f"Sentry init skipped: {e}")
        return False


@contextmanager
def agent_span(name: str, data: Optional[Dict[str, Any]] = None):
    """Record an agent tool/step span when Sentry is configured."""
    start = time.time()
    span_ctx = None
    try:
        import sentry_sdk

        if _initialized or os.getenv("SENTRY_DSN"):
            if not _initialized:
                init_sentry()
            span_ctx = sentry_sdk.start_span(op="quoteflow.agent", description=name)
            if data and span_ctx:
                for k, v in data.items():
                    span_ctx.set_data(k, v)
            if span_ctx:
                span_ctx.__enter__()
    except Exception:
        span_ctx = None

    try:
        yield
    finally:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        try:
            if span_ctx:
                span_ctx.set_data("duration_ms", elapsed_ms)
                span_ctx.__exit__(None, None, None)
        except Exception:
            pass


def capture_agent_event(message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    try:
        import sentry_sdk

        if not _initialized:
            init_sentry()
        if _initialized:
            sentry_sdk.capture_message(message, level="info")
            if extra:
                with sentry_sdk.configure_scope() as scope:
                    for k, v in extra.items():
                        scope.set_extra(k, v)
    except Exception:
        pass
