"""Download the declared NASA standard swaths using local Earthdata credentials.

Credentials are managed by earthaccess and never written into the project.
"""

import concurrent.futures
import hashlib
import json
import time
from pathlib import Path

import earthaccess

from pipeline.catalog import RAW, ROOT


def acquire(manifest: Path):
    pairs = json.loads(manifest.read_text())["pairs"]
    files = {}
    for p in pairs:
        for source in p["products"].values():
            files[source["file"]] = source

    def verify(path, source):
        expected = source.get("bytes", source.get("size"))
        if expected and path.stat().st_size != expected:
            raise RuntimeError("Source size mismatch for " + source["file"])
        if (
            source.get("sha256")
            and hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]
        ):
            raise RuntimeError("Source checksum mismatch for " + source["file"])

    todo = []
    for name, source in files.items():
        path = RAW / "swaths" / name
        if path.exists():
            verify(path, source)
        else:
            todo.append(source)
    if not todo:
        print(f"All {len(files)} declared swath files are cached.")
        return
    auth = earthaccess.login(strategy="netrc")
    if not auth.authenticated:
        raise RuntimeError(
            "Configure Earthdata login locally before acquiring standard swaths."
        )
    target = RAW / "swaths"
    target.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    session = earthaccess.get_requests_https_session()

    def download(source):
        path = target / source["file"]
        temp = path.with_suffix(path.suffix + ".part")
        with session.get(source["url"], stream=True, timeout=180) as response:
            response.raise_for_status()
            if "text/html" in response.headers.get("content-type", ""):
                raise RuntimeError(
                    "NASA returned a login page rather than a data file."
                )
            with temp.open("wb") as stream:
                for block in response.iter_content(1024 * 1024):
                    stream.write(block)
        verify(temp, source)
        temp.replace(path)
        return path.stat().st_size

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        sizes = list(pool.map(download, todo))
    print(
        f"Fetched {len(sizes)} files, {sum(sizes) / 1e6:.1f} MB in {time.perf_counter() - started:.1f} s"
    )


if __name__ == "__main__":
    acquire(ROOT / "config" / "swath-pairs.json")
