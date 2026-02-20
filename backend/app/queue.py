from rq import Queue

from app.config import get_settings
from app.deps import get_redis


def get_queue() -> Queue:
    settings = get_settings()
    redis_conn = get_redis()
    return Queue("b2bak", connection=redis_conn, default_timeout=300)


def publish_notification_job(request_id: str) -> None:
    # Minimal background worker task for publish events.
    print(f"[worker] Request published notification for {request_id}")
