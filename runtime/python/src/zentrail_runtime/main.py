from __future__ import annotations

import signal
import sys

from .runtime import Runtime


def main() -> int:
    rt = Runtime()
    rt.start()

    def _handle(_signum, _frame):
        rt.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, _handle)
    signal.signal(signal.SIGTERM, _handle)

    # Keep the process alive until signalled. Later phases replace this with the
    # MCP / LangGraph serve loop.
    try:
        signal.pause()
    except AttributeError:  # Windows lacks signal.pause
        import time

        while True:
            time.sleep(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
