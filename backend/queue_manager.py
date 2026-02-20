"""Cola de ejecuciones para el Orquestador de Bots.

- ui_queue: bots que requieren UI de escritorio (max 1 simultáneo)
- headless_queue: bots headless (max N simultáneos, configurable)
"""

import asyncio
import logging
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)

ui_queue: asyncio.Queue = asyncio.Queue()
headless_queue: asyncio.Queue = asyncio.Queue()

_workers: list[asyncio.Task] = []
_run_fn: Callable[[str], Awaitable[None]] = None


def init_workers(run_fn: Callable[[str], Awaitable[None]], max_headless: int = 3):
    """Registra la función de ejecución e inicia los worker tasks.
    Debe llamarse desde el lifespan de FastAPI (dentro del loop de asyncio).
    """
    global _run_fn
    _run_fn = run_fn

    # 1 worker para bots con UI
    _workers.append(asyncio.create_task(_worker(ui_queue, "ui-worker")))

    # N workers para bots headless
    for i in range(max_headless):
        _workers.append(asyncio.create_task(_worker(headless_queue, f"headless-worker-{i}")))

    logger.info("Queue manager iniciado: 1 UI worker + %d headless workers", max_headless)


async def _worker(queue: asyncio.Queue, name: str):
    logger.info("Worker '%s' iniciado", name)
    while True:
        execution_id: str = await queue.get()
        try:
            logger.info("Worker '%s' procesando ejecución %s", name, execution_id)
            if _run_fn:
                await _run_fn(execution_id)
        except Exception as e:
            logger.error("Worker '%s' error en ejecución %s: %s", name, execution_id, e)
        finally:
            queue.task_done()


async def enqueue(execution_id: str, requires_ui: bool):
    """Encola una ejecución en la cola correspondiente."""
    if requires_ui:
        await ui_queue.put(execution_id)
        logger.info("Ejecución %s encolada en UI queue (tamaño: %d)", execution_id, ui_queue.qsize())
    else:
        await headless_queue.put(execution_id)
        logger.info("Ejecución %s encolada en headless queue (tamaño: %d)", execution_id, headless_queue.qsize())


def get_queue_status() -> dict:
    return {
        "ui_queue_size": ui_queue.qsize(),
        "headless_queue_size": headless_queue.qsize(),
    }


def stop_workers():
    for task in _workers:
        task.cancel()
    _workers.clear()
