import asyncio
from typing import Callable

class TelemetryWatcher:
    def __init__(self, poll_interval: int = 5, on_alert: Callable = None):
        self.poll_interval = poll_interval
        self.on_alert = on_alert
        self.is_running = False
        self._task = None

    async def start(self):
        """
        UC-3 & FR-6: Run a background loop comparing telemetry data
        against failure signatures stored in the graph.
        """
        self.is_running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self):
        while self.is_running:
            # Simulate fetching telemetry
            # Compare against DB patterns
            # Trigger alert callback if match found
            await asyncio.sleep(self.poll_interval)
