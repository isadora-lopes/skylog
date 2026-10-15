import threading
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


class TTLCache:
    """Cache em memória thread-safe com TTL e limite de entradas."""

    def __init__(self, ttl_sec: int, max_size: int = 128):
        self.ttl_sec = ttl_sec
        self.max_size = max_size
        self._store: dict[str, tuple[float, T]] = {}
        self._lock = threading.Lock()

    def get_or_set(self, key: str, factory: Callable[[], T]) -> T:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry and entry[0] > now:
                return entry[1]

        value = factory()

        with self._lock:
            if len(self._store) >= self.max_size:
                oldest_key = min(self._store.items(), key=lambda item: item[1][0])[0]
                del self._store[oldest_key]
            self._store[key] = (now + self.ttl_sec, value)
        return value
