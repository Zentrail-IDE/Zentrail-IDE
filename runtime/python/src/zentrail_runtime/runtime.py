from __future__ import annotations

import logging
import os

logging.basicConfig(level=os.environ.get("ZENTRAIL_LOG_LEVEL", "INFO"))
logger = logging.getLogger("zentrail.runtime")


class Runtime:
    """Phase 1 AI runtime skeleton.

    Later phases wire this to an MCP server (tool/resource exposure) and a
    LangGraph orchestration graph for multi-agent collaboration. For now it
    boots, reports its identity, and is ready to be launched as a Tauri sidecar
    or standalone process.
    """

    def __init__(self, data_dir: str | None = None) -> None:
        self.data_dir = data_dir or os.environ.get("ZENTRAIL_DATA_DIR", ".data")
        self.ready = False

    def start(self) -> None:
        logger.info("zentrail-runtime starting (data_dir=%s)", self.data_dir)
        # TODO(phase-5): build MCP server + LangGraph graph.
        self.ready = True
        logger.info("zentrail-runtime ready")

    def stop(self) -> None:
        logger.info("zentrail-runtime stopping")
        self.ready = False
