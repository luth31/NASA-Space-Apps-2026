"""One CPU-first, measured rebuild from pinned NASA sources to app artifacts."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import os
import platform
import resource
import subprocess
import sys
import time

from pipeline.build import write_json
from pipeline.catalog import PUBLIC, ROOT


def run(refresh=False, budget_seconds=7200):
    started = time.perf_counter()
    stages = []
    for module in ["build", "acquire", "coverage", "train", "release", "monthly"]:
        command = [sys.executable, "-m", "pipeline." + module]
        if module == "build" and refresh:
            command.append("--refresh")
        remaining = budget_seconds - (time.perf_counter() - started)
        if remaining <= 0:
            raise TimeoutError("The declared CPU batch budget has been reached")
        stage_start = time.perf_counter()
        subprocess.run(command, cwd=ROOT, check=True, timeout=remaining)
        stages.append(
            {"stage": module, "seconds": round(time.perf_counter() - stage_start, 3)}
        )
    usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    peak_bytes = usage.ru_maxrss if sys.platform == "darwin" else usage.ru_maxrss * 1024
    result = {
        "schemaVersion": 1,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "cachePolicy": "refresh public point sources; verify cached swaths"
        if refresh
        else "reuse checksum-verified local source cache",
        "stages": stages,
        "totalSeconds": round(time.perf_counter() - started, 3),
        "budgetSeconds": budget_seconds,
        "cpuCount": os.cpu_count(),
        "architecture": platform.machine(),
        "peakChildResidentBytes": peak_bytes,
        "publishedDataBytes": sum(
            p.stat().st_size
            for p in PUBLIC.rglob("*")
            if p.is_file() and p.name != "benchmark.json"
        ),
        "gpuUsed": False,
        "note": "This measures the declared batch on this machine. A cached run does not measure fresh NASA transfer latency. Models and coverage artifacts remain separate from the web build.",
    }
    write_json(PUBLIC / "benchmark.json", result)
    print(
        f"Batch complete in {result['totalSeconds']:.1f} s; peak child RSS {peak_bytes / 1e9:.2f} GB; GPU unused."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Intentionally replace the public-source lock and create a new observation snapshot",
    )
    parser.add_argument("--budget-seconds", type=int, default=7200)
    args = parser.parse_args()
    run(args.refresh, args.budget_seconds)
