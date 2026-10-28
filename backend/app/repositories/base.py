"""
Base Repository & Data Access Layer (DAL)
Provides an abstract contract and JSON/In-Memory implementation.
Allows seamless swap to PostgreSQL / Prisma / SQLAlchemy in the future.
"""

from abc import ABC, abstractmethod
import json
import os
from pathlib import Path
from typing import Generic, TypeVar, List, Optional, Callable, Dict, Any
import threading

T = TypeVar('T', bound=Dict[str, Any])

class BaseRepository(ABC, Generic[T]):
    @abstractmethod
    def get_all(self) -> List[T]:
        pass

    @abstractmethod
    def get_by_id(self, item_id: str) -> Optional[T]:
        pass

    @abstractmethod
    def add(self, item: T) -> T:
        pass

    @abstractmethod
    def update(self, item_id: str, item_updates: Dict[str, Any]) -> Optional[T]:
        pass

    @abstractmethod
    def delete(self, item_id: str) -> bool:
        pass

    @abstractmethod
    def filter(self, predicate: Callable[[T], bool]) -> List[T]:
        pass

    @abstractmethod
    def replace_all(self, items: List[T]) -> None:
        pass

class JsonRepository(BaseRepository[T]):
    """
    In-memory data store with JSON file persistence.
    Thread-safe reads and writes.
    """
    def __init__(self, file_path: str, id_field: str = "id"):
        self.file_path = Path(file_path)
        self.id_field = id_field
        self._lock = threading.RLock()
        self._items: Dict[str, T] = {}
        self._load()

    def _load(self):
        with self._lock:
            if self.file_path.exists():
                try:
                    with open(self.file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self._items = {item[self.id_field]: item for item in data if self.id_field in item}
                except Exception as e:
                    print(f"Error loading {self.file_path}: {e}")
                    self._items = {}
            else:
                self.file_path.parent.mkdir(parents=True, exist_ok=True)
                self._items = {}
                self._save()

    def _save(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(list(self._items.values()), f, indent=2)
        except Exception as e:
            print(f"Error saving {self.file_path}: {e}")

    def get_all(self) -> List[T]:
        with self._lock:
            return list(self._items.values())

    def get_by_id(self, item_id: str) -> Optional[T]:
        with self._lock:
            item = self._items.get(item_id)
            return item.copy() if item else None

    def add(self, item: T) -> T:
        with self._lock:
            item_id = item.get(self.id_field)
            if not item_id:
                raise ValueError(f"Missing {self.id_field} in item")
            self._items[item_id] = item.copy()
            self._save()
            return item

    def update(self, item_id: str, item_updates: Dict[str, Any]) -> Optional[T]:
        with self._lock:
            if item_id not in self._items:
                return None
            current = self._items[item_id]
            current.update(item_updates)
            self._items[item_id] = current
            self._save()
            return current.copy()

    def delete(self, item_id: str) -> bool:
        with self._lock:
            if item_id in self._items:
                del self._items[item_id]
                self._save()
                return True
            return False

    def filter(self, predicate: Callable[[T], bool]) -> List[T]:
        with self._lock:
            return [item.copy() for item in self._items.values() if predicate(item)]

    def replace_all(self, items: List[T]) -> None:
        with self._lock:
            self._items = {item[self.id_field]: item.copy() for item in items if self.id_field in item}
            self._save()
