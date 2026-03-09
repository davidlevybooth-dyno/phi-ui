#!/usr/bin/env python3
"""
phi — Dyno Phi protein design platform CLI.

Submit scoring jobs, manage datasets, and download results from
the Dyno Phi API at https://design.dynotx.com/api/v1.

Authentication:
  export DYNO_API_KEY=your_key   # from Settings → API keys
  export DYNO_API_BASE_URL=...   # optional override

Quick try (single sequence / structure):
  phi esmfold     --fasta sequences.fasta
  phi alphafold   --fasta complex.fasta
  phi proteinmpnn --pdb design.pdb  --num-sequences 20
  phi esm2        --fasta sequences.fasta
  phi boltz       --fasta complex.fasta

Batch workflow (100–50,000 files):
  phi upload --dir ./designs/ --file-type pdb --run-id pdl1_batch
  # → prints dataset_id: dataset_abc

  phi esmfold     --dataset-id dataset_abc --out ./screen
  phi alphafold   --dataset-id dataset_abc --out ./validation
  phi proteinmpnn --dataset-id dataset_abc --num-sequences 20

Dataset management:
  phi datasets               # list your datasets
  phi dataset DATASET_ID     # show dataset details

Authentication:
  phi login                  # verify API key + print connection and identity

Research:
  phi research --question "What are known PD-L1 binding hotspots?"

Job management:
  phi status   JOB_ID
  phi jobs     [--limit 20] [--status running]
  phi cancel   JOB_ID
  phi download JOB_ID [--out ./results]
"""

import argparse
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import NoReturn, TypedDict

from rich import box as rich_box
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table
from rich.text import Text


# ─────────────────────────── rich console ────────────────────────────────────

console = Console()
err_console = Console(stderr=True)

# ─────────────────────────── colour palette ──────────────────────────────────
# Three muted tones that feel cohesive and don't strain the eye.
_C_SAND = "#B5A58F"   # warm sand  — success, ✓ marks, completed
_C_ROSE = "#D4A5B8"   # dusty rose — errors, failed, cancelled, warnings
_C_BLUE = "#8FA5B8"   # steel blue — info, filenames, links, running


# ─────────────────────────── API response shapes ─────────────────────────────

class IngestSessionResponse(TypedDict, total=False):
    session_id: str
    id: str          # alternative key some backends use
    status: str
    expected_files: int
    uploaded_files: int
    dataset_id: str
    artifact_count: int
    error: str


class SignedUrlEntry(TypedDict):
    file: str
    url: str


class SignedUrlsResponse(TypedDict, total=False):
    urls: list[SignedUrlEntry]


class JobSubmitResponse(TypedDict, total=False):
    job_id: str
    run_id: str
    status: str
    message: str


def _require_key(d: dict, key: str, context: str) -> str:
    """Return d[key] or die with a clear message if missing."""
    value = d.get(key)
    if not value:
        _die(f"API response for {context} is missing required field '{key}': {d}")
    return value  # type: ignore[return-value]  # _die() is NoReturn

# ─────────────────────────── configuration ───────────────────────────────────

DEFAULT_BASE_URL = "https://design.dynotx.com"
POLL_INTERVAL      = 5     # seconds between status checks
POLL_TIMEOUT       = 7200  # 2-hour maximum poll window
TERMINAL_STATUSES  = {"completed", "failed", "cancelled"}
# "submitted" kept for backward compat with jobs created before the 2026-03-07 backend fix.
# New jobs return "pending" immediately on submission.
NON_TERMINAL_STATUSES = {"pending", "submitted", "running"}
INGEST_TERMINAL    = {"READY", "FAILED"}
UPLOAD_BATCH_SIZE  = 50    # filenames per signed-URL request
UPLOAD_WORKERS     = 8     # parallel upload threads


def _base_url() -> str:
    return os.environ.get("DYNO_API_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


def _ssl_context() -> ssl.SSLContext:
    """Return an SSL context that works on macOS where system certs may be missing."""
    ctx = ssl.create_default_context()
    # Honour explicit override first (e.g. SSL_CERT_FILE=/opt/homebrew/etc/openssl@3/cert.pem)
    env_cafile = os.environ.get("SSL_CERT_FILE")
    if env_cafile and Path(env_cafile).exists():
        ctx.load_verify_locations(env_cafile)
        return ctx
    # Try common macOS Homebrew / Linux system locations
    for cafile in [
        "/opt/homebrew/etc/openssl@3/cert.pem",
        "/opt/homebrew/etc/openssl@1.1/cert.pem",
        "/etc/ssl/cert.pem",
        "/usr/local/etc/openssl/cert.pem",
    ]:
        if Path(cafile).exists():
            ctx.load_verify_locations(cafile)
            return ctx
    return ctx  # fall back to default (works fine on Linux CI)


def _api_key() -> str:
    key = os.environ.get("DYNO_API_KEY")
    if not key:
        for candidate in [Path(".env"), Path.home() / ".dyno" / ".env"]:
            if candidate.exists():
                for line in candidate.read_text().splitlines():
                    line = line.strip()
                    if line.startswith("DYNO_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip("\"'")
                        if key:
                            break
    if not key:
        _die(
            "DYNO_API_KEY is not set.\n"
            "  1. Open https://design.dynotx.com/dashboard/settings\n"
            "  2. Create an API key under 'API keys'\n"
            "  3. Run: export DYNO_API_KEY=your_key"
        )
    return key  # _die() is NoReturn, so type-checker knows this is never None


class PhiApiError(Exception):
    """Raised by _request() on HTTP or network errors."""
    def __init__(self, msg: str) -> None:
        super().__init__(msg)


def _die(msg: str) -> NoReturn:
    err_console.print(f"[bold {_C_ROSE}]error:[/] {msg}")
    sys.exit(1)


# ─────────────────────────── HTTP helpers ────────────────────────────────────

def _request(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{_base_url()}/api/v1{path}"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": _api_key(),
        "X-Organization-ID": os.environ.get("DYNO_ORG_ID", "default-org"),
        "X-User-ID": os.environ.get("DYNO_USER_ID", "default-user"),
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read())
        except Exception:
            detail = e.reason
        raise PhiApiError(f"HTTP {e.code} — {detail}") from e
    except urllib.error.URLError as e:
        raise PhiApiError(f"Network error — {e.reason}\n  URL: {url}") from e


_UPLOAD_RETRIES    = 3
_UPLOAD_RETRY_BASE = 2.0  # seconds; doubles on each retry

def _put_file(signed_url: str, path: Path) -> None:
    """Upload a single file via signed URL (no auth header — direct-to-GCS).

    Retries up to _UPLOAD_RETRIES times with exponential backoff on transient
    errors (HTTP 429, 5xx, and network timeouts).
    """
    data = path.read_bytes()
    last_exc: Exception | None = None

    for attempt in range(_UPLOAD_RETRIES):
        req = urllib.request.Request(
            signed_url,
            data=data,
            headers={"Content-Type": "application/octet-stream"},
            method="PUT",
        )
        try:
            with urllib.request.urlopen(req, timeout=300, context=_ssl_context()) as resp:
                _ = resp.read()
            return  # success
        except urllib.error.HTTPError as e:
            if e.code in {429, 500, 502, 503, 504} and attempt < _UPLOAD_RETRIES - 1:
                wait = _UPLOAD_RETRY_BASE ** attempt
                time.sleep(wait)
                last_exc = e
                continue
            raise RuntimeError(f"Upload failed for {path.name}: HTTP {e.code}") from e
        except urllib.error.URLError as e:
            if attempt < _UPLOAD_RETRIES - 1:
                wait = _UPLOAD_RETRY_BASE ** attempt
                time.sleep(wait)
                last_exc = e
                continue
            raise RuntimeError(f"Upload failed for {path.name}: {e.reason}") from e

    raise RuntimeError(f"Upload failed for {path.name} after {_UPLOAD_RETRIES} attempts") from last_exc


def _resolve_identity() -> None:
    """Populate DYNO_USER_ID + DYNO_ORG_ID from GET /auth/me if not already set.

    Upload endpoints require X-User-ID and X-Organization-ID headers.
    Silently falls back to env-var defaults when /auth/me returns 404
    (staging environments where Clerk is not yet wired up).
    Run `phi login` to see current identity and connection status.
    """
    if os.environ.get("DYNO_USER_ID") and os.environ.get("DYNO_ORG_ID"):
        return
    try:
        me = _request("GET", "/auth/me")
        if not os.environ.get("DYNO_USER_ID"):
            os.environ["DYNO_USER_ID"] = me.get("user_id") or ""
        if not os.environ.get("DYNO_ORG_ID"):
            os.environ["DYNO_ORG_ID"] = me.get("org_id") or ""
    except PhiApiError:
        pass  # staging / local: static key, no /auth/me — use env defaults


def _submit(job_type: str, params: dict, run_id: str | None = None,
            context: dict | None = None, dataset_id: str | None = None) -> dict:
    body: dict = {"job_type": job_type, "params": params}
    if dataset_id:
        body["dataset_id"] = dataset_id
    if run_id:
        body["run_id"] = run_id
    if context:
        body["context"] = context
    return _request("POST", "/jobs/", body)


def _status(job_id: str) -> dict:
    return _request("GET", f"/jobs/{job_id}/status")


# ─────────────────────────── status colors ───────────────────────────────────

_STATUS_COLOR = {
    "completed": _C_SAND,
    "failed": _C_ROSE,
    "cancelled": _C_ROSE,
    "running": _C_BLUE,
    "pending": "dim",
    "submitted": "dim",
}
_STATUS_ICON = {
    "completed": "✓",
    "failed": "✗",
    "cancelled": "⊘",
}


# ─────────────────────────── polling ─────────────────────────────────────────

def _poll(job_id: str, quiet: bool = False) -> dict:
    """Poll until terminal status and return final status object.

    On a TTY: shows a live animated spinner that updates in place.
    On non-TTY (CI/pipe) or quiet=True: falls back to scrolling plain-text lines.
    """
    start = time.time()

    def _fetch() -> tuple[dict, str, int, int, str]:
        s = _status(job_id)
        status = s.get("status", "unknown")
        progress = s.get("progress") or {}
        pct = int(progress.get("percent_complete", 0))
        step = str(progress.get("current_step", ""))
        return s, status, pct, int(time.time() - start), step

    if quiet:
        while time.time() - start < POLL_TIMEOUT:
            s, status, _, _, _ = _fetch()
            if status in TERMINAL_STATUSES:
                return s
            time.sleep(POLL_INTERVAL)
        raise PhiApiError(f"Timed out after {POLL_TIMEOUT}s waiting for job {job_id}")

    if console.is_terminal:
        with console.status("", spinner="dots") as live:
            while time.time() - start < POLL_TIMEOUT:
                s, status, pct, elapsed, step = _fetch()
                color = _STATUS_COLOR.get(status, "white")
                msg = (
                    f"[{color}]{status}[/]  "
                    f"[dim]{pct:>3}%  {elapsed:>4}s[/]"
                )
                if step:
                    msg += f"  [dim]{step[:70]}[/]"
                live.update(msg)
                if status in TERMINAL_STATUSES:
                    return s
                time.sleep(POLL_INTERVAL)
        raise PhiApiError(f"Timed out after {POLL_TIMEOUT}s waiting for job {job_id}")

    # non-TTY fallback: scrolling lines
    while time.time() - start < POLL_TIMEOUT:
        s, status, pct, elapsed, step = _fetch()
        parts = [f"[{elapsed:>4}s]", f"{status:<12}", f"{pct:>3}%"]
        if step:
            parts.append(step[:60])
        print("  " + "  ".join(parts))
        if status in TERMINAL_STATUSES:
            return s
        time.sleep(POLL_INTERVAL)
    raise PhiApiError(f"Timed out after {POLL_TIMEOUT}s waiting for job {job_id}")


# ─────────────────────────── pretty output ───────────────────────────────────

def _print_submission(result: dict) -> None:
    console.print(f"\n[bold {_C_SAND}]✓[/] Job submitted")
    console.print(f"  [dim]job_id[/]  {result.get('job_id')}")
    console.print(f"  [dim]run_id[/]  {result.get('run_id')}")
    console.print(f"  [dim]status[/]  [dim]{result.get('status')}[/]")
    if result.get("message"):
        console.print(f"  [dim]message[/] {result['message']}")


def _duration_str(started_at: str, completed_at: str) -> str:
    """Return human-readable elapsed like '74s', or '' on parse failure."""
    try:
        t0 = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
        return f"{int((t1 - t0).total_seconds())}s"
    except Exception:
        return ""


def _print_status(s: dict) -> None:
    status = s.get("status", "?")
    icon = _STATUS_ICON.get(status, "·")
    color = _STATUS_COLOR.get(status, "white")
    job_id = s.get("job_id", "?")

    duration = ""
    if s.get("started_at") and s.get("completed_at"):
        d = _duration_str(s["started_at"], s["completed_at"])
        if d:
            duration = f"  [dim]{d}[/]"

    console.print(f"\n[{color}]{icon}[/] [bold]{job_id}[/]  [[{color}]{status}[/]]{duration}")

    if s.get("error"):
        console.print(f"  [{_C_ROSE}]error[/] : {s['error']}")

    p = s.get("progress") or {}
    if p.get("current_step"):
        console.print(f"  [dim]step[/]  : {p['current_step']}")

    if s.get("started_at") and s.get("completed_at"):
        t0 = s["started_at"][:19].replace("T", " ")
        t1 = s["completed_at"][:19].replace("T", " ")
        console.print(f"  [dim]timing[/] : {t0} → {t1}")

    files = s.get("output_files") or []
    if files:
        table = Table(
            box=rich_box.SIMPLE,
            padding=(0, 1),
            show_header=True,
            header_style="dim",
            show_edge=False,
        )
        table.add_column("filename", style=_C_BLUE, no_wrap=True)
        table.add_column("type", style="dim")
        for f in files[:10]:
            fname = f.get("filename") or f.get("gcs_url", "?")
            ftype = f.get("artifact_type", "")
            table.add_row(fname, ftype)
        if len(files) > 10:
            table.add_row(f"[dim]… {len(files) - 10} more[/]", "")
        console.print(table)


# ─────────────────────────── ingest helpers ──────────────────────────────────

def _collect_files(args: argparse.Namespace) -> list[Path]:
    """Return a deduplicated sorted list of files to upload.

    Raises SystemExit early if any filenames collide (same basename from
    different directories), because the signed-URL map is keyed by filename.
    """
    paths: list[Path] = []

    # Positional file arguments
    for f in getattr(args, "files", None) or []:
        p = Path(f)
        if not p.exists():
            _die(f"File not found: {f}")
        paths.append(p)

    # --dir directory scan
    if getattr(args, "dir", None):
        d = Path(args.dir)
        if not d.is_dir():
            _die(f"Not a directory: {args.dir}")
        ext = f".{args.file_type}" if getattr(args, "file_type", None) else None
        found = sorted(d.iterdir()) if not ext else sorted(d.glob(f"*{ext}"))
        if not found:
            _die(f"No {'*' + ext if ext else ''} files found in {d}")
        paths.extend(found)

    if not paths:
        _die(
            "No files specified. Use positional arguments, --dir, or --gcs.\n"
            "  phi upload --dir ./designs/ --file-type pdb\n"
            "  phi upload binder_001.pdb binder_002.pdb\n"
            "  phi upload sequences.fasta"
        )

    # Deduplicate by resolved path (same inode from two relative references)
    seen_resolved: set[Path] = set()
    unique: list[Path] = []
    for p in paths:
        rp = p.resolve()
        if rp not in seen_resolved:
            seen_resolved.add(rp)
            unique.append(p)

    # Fail fast on filename collisions — signed-URL map is keyed by p.name
    names: list[str] = [p.name for p in unique]
    seen_names: set[str] = set()
    collisions: list[str] = []
    for name in names:
        if name in seen_names:
            collisions.append(name)
        seen_names.add(name)
    if collisions:
        _die(
            f"Filename collision(s) detected — the upload API keys signed URLs by "
            f"filename, so all files must have unique basenames.\n"
            f"  Colliding names: {', '.join(sorted(set(collisions)))}\n"
            f"  Rename the duplicates before uploading."
        )

    return unique


def _ingest_poll(session_id: str) -> dict:
    """Poll an ingest session until READY or FAILED.

    On a TTY: shows a live animated spinner.
    On non-TTY: scrolling plain-text lines.
    """
    start = time.time()

    def _fetch() -> tuple[dict, str, int, int]:
        s = _request("GET", f"/ingest_sessions/{session_id}")
        status = s.get("status", "UNKNOWN")
        uploaded = int(s.get("uploaded_files", 0))
        expected = s.get("expected_files", "?")
        return s, status, uploaded, expected

    if console.is_terminal:
        with console.status("", spinner="dots") as live:
            while time.time() - start < POLL_TIMEOUT:
                s, status, uploaded, expected = _fetch()
                elapsed = int(time.time() - start)
                color = _C_SAND if status == "READY" else (_C_ROSE if status == "FAILED" else _C_BLUE)
                live.update(
                    f"[{color}]{status}[/]  "
                    f"[dim]{uploaded}/{expected} files indexed  {elapsed}s[/]"
                )
                if status in INGEST_TERMINAL:
                    return s
                time.sleep(POLL_INTERVAL)
        raise PhiApiError(f"Timed out after {POLL_TIMEOUT}s waiting for ingest session {session_id}")

    # non-TTY fallback
    while time.time() - start < POLL_TIMEOUT:
        s, status, uploaded, expected = _fetch()
        elapsed = int(time.time() - start)
        print(f"  [{elapsed:>4}s]  {status:<14}  {uploaded}/{expected} files indexed")
        if status in INGEST_TERMINAL:
            return s
        time.sleep(POLL_INTERVAL)
    raise PhiApiError(f"Timed out after {POLL_TIMEOUT}s waiting for ingest session {session_id}")


# ─────────────────────────── subcommands ─────────────────────────────────────

def _run_model_job(job_type: str, params: dict, args: argparse.Namespace) -> None:
    """Shared logic for all model job commands — handles dataset-id or inline mode."""
    dataset_id = getattr(args, "dataset_id", None)
    result: JobSubmitResponse = _submit(job_type, params, run_id=args.run_id, dataset_id=dataset_id)
    job_id = _require_key(result, "job_id", f"POST /jobs ({job_type})")
    _print_submission(result)
    if args.wait:
        console.print(f"\n[dim]Polling every {POLL_INTERVAL}s …[/]")
        final = _poll(job_id)
        _print_status(final)
        if args.out and final.get("status") == "completed":
            _download_job(final, args.out)


def _create_ingest_session(files: list[Path], args: argparse.Namespace) -> str:
    """Create an ingest session and return its ID."""
    body: dict = {"expected_files": len(files)}
    if args.run_id:
        body["run_id"] = args.run_id
    if getattr(args, "file_type", None):
        body["file_type"] = args.file_type
    session: IngestSessionResponse = _request("POST", "/ingest_sessions/", body)
    # Accept either "session_id" or "id" as the session identifier
    session_id = session.get("session_id") or session.get("id")
    if not session_id:
        _die(f"POST /ingest_sessions response missing 'session_id': {session}")
    console.print(f"  [dim]session_id[/] : {session_id}")
    return session_id


def _request_signed_urls(session_id: str, files: list[Path]) -> dict[str, str]:
    """Request signed upload URLs for all files; returns filename → URL mapping."""
    total = len(files)
    batches = [files[i:i + UPLOAD_BATCH_SIZE] for i in range(0, total, UPLOAD_BATCH_SIZE)]
    console.print(f"  Requesting signed URLs ({len(batches)} batch(es) of ≤{UPLOAD_BATCH_SIZE}) …")
    url_map: dict[str, str] = {}
    for batch in batches:
        resp = _request(
            "POST",
            f"/ingest_sessions/{session_id}/upload_urls",
            {"files": [p.name for p in batch]},
        )
        for entry in resp.get("urls", []):
            url_map[entry["file"]] = entry["url"]
    if len(url_map) != total:
        _die(
            f"Expected {total} signed URLs but received {len(url_map)}. "
            "Check the ingest_sessions endpoint."
        )
    return url_map


def _upload_all_parallel(
    files: list[Path], url_map: dict[str, str]
) -> list[str]:
    """Upload all files in parallel. Returns a list of failure messages (empty = success)."""
    total = len(files)
    failures: list[str] = []

    def _upload_one(path: Path) -> tuple[str, bool, str]:
        signed_url = url_map.get(path.name)
        if not signed_url:
            return path.name, False, "No signed URL received"
        try:
            _put_file(signed_url, path)
            return path.name, True, ""
        except RuntimeError as exc:
            return path.name, False, str(exc)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        task = progress.add_task(
            f"  Uploading {total} file(s) with {UPLOAD_WORKERS} workers",
            total=total,
        )
        with ThreadPoolExecutor(max_workers=UPLOAD_WORKERS) as pool:
            futures = {pool.submit(_upload_one, p): p for p in files}
            for future in as_completed(futures):
                name, ok, err = future.result()
                progress.advance(task)
                if not ok:
                    failures.append(f"{name}: {err}")
                    console.print(f"  [bold {_C_ROSE}]✗[/] [dim]{name}[/]: {err}")

    return failures


def _print_dataset_ready(dataset_id: str | None, artifact_count: int) -> None:
    content = Text()
    content.append("dataset_id      ", style="dim")
    content.append(f"{dataset_id}\n", style=f"bold {_C_BLUE}")
    content.append("artifact_count  ", style="dim")
    content.append(f"{artifact_count}\n\n")
    content.append("Run a job against this dataset:\n", style="bold")
    content.append(f"  phi esmfold     --dataset-id {dataset_id}\n", style=_C_SAND)
    content.append(f"  phi alphafold   --dataset-id {dataset_id}\n", style=_C_SAND)
    content.append(f"  phi proteinmpnn --dataset-id {dataset_id}", style=_C_SAND)
    console.print(
        Panel(
            content,
            title=f"[bold {_C_SAND}]✓ Dataset ready[/]",
            border_style=_C_SAND,
            padding=(1, 2),
        )
    )


def _ensure_authenticated() -> None:
    """Probe the API; on 401, exit with a clear message. Use before upload/job commands."""
    try:
        _request("GET", "/jobs/?page_size=1")
    except PhiApiError as e:
        if "401" in str(e):
            _die(
                "Not authenticated. Run 'phi login' to verify your API key and endpoint."
            )
        raise


def cmd_upload(args: argparse.Namespace) -> None:
    """Upload local files → staged ingest → versioned dataset."""
    _resolve_identity()  # populate X-User-ID + X-Organization-ID from /auth/me or env
    _ensure_authenticated()

    if getattr(args, "gcs", None):
        console.print("  External GCS import is not yet available.")
        console.print("  The backend import worker is planned — see backend-api-gaps.md §9.")
        console.print(f"  When available: phi upload --gcs {args.gcs}")
        return

    files = _collect_files(args)
    console.print(f"[bold {_C_SAND}]✓[/] Found {len(files)} file(s) to upload")

    session_id = _create_ingest_session(files, args)
    url_map = _request_signed_urls(session_id, files)

    failures = _upload_all_parallel(files, url_map)
    if failures:
        console.print(f"\n[bold {_C_ROSE}]error:[/] {len(failures)} upload(s) failed:")
        for msg in failures[:10]:
            console.print(f"  [dim]{msg}[/]")
        _die("Upload incomplete — fix errors and retry.")

    console.print(f"  [bold {_C_SAND}]✓[/] All {len(files)} file(s) uploaded successfully")

    console.print("  Finalizing ingest session …")
    _request("POST", f"/ingest_sessions/{session_id}/finalize", {})

    if args.wait:
        console.print(f"\n[dim]Ingesting and validating files (polling every {POLL_INTERVAL}s) …[/]")
        result = _ingest_poll(session_id)
        status = result.get("status")
        if status == "READY":
            _print_dataset_ready(result.get("dataset_id"), result.get("artifact_count", len(files)))
        else:
            _die(f"Ingest failed ({status}): {result.get('error', 'unknown error')}")
    else:
        console.print(f"\n[bold {_C_SAND}]✓[/] Session finalized — ingestion running in background")
        console.print(f"  [dim]session_id[/]: {session_id}")
        console.print(f"  Check status: [{_C_BLUE}]phi ingest-session {session_id}[/]")


def cmd_ingest_session(args: argparse.Namespace) -> None:
    """Show status of an ingest session (after upload + finalize)."""
    result = _request("GET", f"/ingest_sessions/{args.session_id}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    console.print(f"[dim]session_id    [/] : {result.get('session_id') or result.get('id', '?')}")
    console.print(f"[dim]status        [/] : {result.get('status', '?')}")
    console.print(f"[dim]expected_files[/] : {result.get('expected_files', '?')}")
    console.print(f"[dim]uploaded_files[/] : {result.get('uploaded_files', '?')}")
    console.print(f"[dim]artifact_count[/] : {result.get('artifact_count', '?')}")
    if result.get("dataset_id"):
        console.print(f"[dim]dataset_id    [/] : {result.get('dataset_id')}")
        console.print(f"\n  [{_C_BLUE}]phi esmfold     --dataset-id {result.get('dataset_id')}[/]")
        console.print(f"  [{_C_BLUE}]phi alphafold   --dataset-id {result.get('dataset_id')}[/]")


def cmd_datasets(args: argparse.Namespace) -> None:
    """List datasets owned by the current user."""
    params = f"?page_size={args.limit}"
    result = _request("GET", f"/datasets{params}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    datasets = result.get("datasets", [])
    if not datasets:
        console.print("[dim]No datasets found.[/]")
        return

    table = Table(box=rich_box.SIMPLE_HEAVY, show_header=True, header_style="bold dim")
    table.add_column("DATASET ID", style=_C_BLUE, no_wrap=True)
    table.add_column("ARTIFACTS", justify="right")
    table.add_column("STATUS")
    table.add_column("CREATED", style="dim")

    for d in datasets:
        status = d.get("status", "?")
        s_color = _C_SAND if status == "READY" else (_C_ROSE if status == "FAILED" else "dim")
        table.add_row(
            d.get("dataset_id", "?"),
            str(d.get("artifact_count", "?")),
            f"[{s_color}]{status}[/]",
            str(d.get("created_at", "?"))[:19],
        )

    console.print(table)
    total = result.get("total") or result.get("total_count") or len(datasets)
    console.print(f"[dim]{total} total dataset(s)[/]")


def cmd_dataset(args: argparse.Namespace) -> None:
    """Show details for a specific dataset."""
    result = _request("GET", f"/datasets/{args.dataset_id}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    console.print(f"[dim]dataset_id    [/] : [{_C_BLUE}]{result.get('dataset_id')}[/]")
    console.print(f"[dim]status        [/] : {result.get('status')}")
    console.print(f"[dim]artifact_count[/] : {result.get('artifact_count')}")
    console.print(f"[dim]version       [/] : {result.get('version', 1)}")
    console.print(f"[dim]created_at    [/] : {str(result.get('created_at', ''))[:19]}")
    manifest = result.get("manifest_uri")
    if manifest:
        console.print(f"[dim]manifest_uri  [/] : {manifest}")
    # Backend returns "files" (sample list); older shape used "sample_artifacts"
    files = result.get("files") or result.get("sample_artifacts") or []
    if files:
        console.print(f"\n[bold]Sample files[/] (first {len(files)}):")
        for f in files:
            fname = f.get("filename") or f.get("source_filename", "?")
            size  = f.get("size_bytes") or f.get("size", 0)
            console.print(f"  [{_C_BLUE}]{fname:<40}[/]  [dim]{size:>10} B[/]")
    console.print(f"\n[bold]Run a job:[/]")
    console.print(f"  [{_C_SAND}]phi esmfold   --dataset-id {result.get('dataset_id')}[/]")
    console.print(f"  [{_C_SAND}]phi alphafold --dataset-id {result.get('dataset_id')}[/]")


def cmd_esmfold(args: argparse.Namespace) -> None:
    """Fast structure prediction from sequence (~1 min/sequence on A100)."""
    params: dict = {
        "num_recycles": args.recycles,
        "extract_confidence": not args.no_confidence,
    }
    if not getattr(args, "dataset_id", None):
        params["fasta_str"] = _read_fasta(args)
        if args.fasta_name:
            params["fasta_name"] = args.fasta_name
    _run_model_job("esmfold", params, args)


def cmd_alphafold(args: argparse.Namespace) -> None:
    """Structure prediction — monomer or multimer (separate chains with ':')."""
    models = [int(m) for m in args.models.split(",") if m.strip()]
    params: dict = {
        "models": models,
        "num_recycles": args.recycles,
        "num_relax": args.relax,
        "use_templates": args.templates,
    }
    if not getattr(args, "dataset_id", None):
        fasta_str = _read_fasta(args)
        # Auto-detect multimer: colon-separated chains in the sequence
        is_multimer = ":" in fasta_str
        params["fasta_str"] = fasta_str
        params["use_multimer"] = is_multimer
        if is_multimer:
            console.print(f"  [dim]multimer mode detected ({fasta_str.count(':') + 1} chains)[/]")
    _run_model_job("alphafold", params, args)


def cmd_proteinmpnn(args: argparse.Namespace) -> None:
    """Sequence design via inverse folding (1–2 min for 10 sequences)."""
    params: dict = {
        "num_sequences": args.num_sequences,
        "temperature": args.temperature,
    }
    if not getattr(args, "dataset_id", None):
        if args.pdb:
            params["pdb_content"] = Path(args.pdb).read_text()
        elif args.pdb_gcs:
            params["pdb_gcs_uri"] = args.pdb_gcs
        else:
            _die("Provide --pdb FILE, --pdb-gcs GCS_URI, or --dataset-id DATASET_ID")
    if args.fixed:
        params["fixed_positions"] = args.fixed
    _run_model_job("proteinmpnn", params, args)


def cmd_esm2(args: argparse.Namespace) -> None:
    """Protein language model scoring: per-position log-likelihood and perplexity."""
    params: dict = {}
    if not getattr(args, "dataset_id", None):
        params["fasta_str"] = _read_fasta(args)
    if args.mask:
        params["mask_positions"] = args.mask
    _run_model_job("esm2", params, args)


def cmd_boltz(args: argparse.Namespace) -> None:
    """Biomolecular structure prediction for complexes, DNA, RNA, and small molecules."""
    params: dict = {
        "num_recycles": args.recycles,
        "use_msa": not args.no_msa,
    }
    if not getattr(args, "dataset_id", None):
        params["fasta_str"] = _read_fasta(args)
    _run_model_job("boltz", params, args)


def cmd_research(args: argparse.Namespace) -> None:
    """Submit a biological research query and return a structured report with citations."""
    params: dict = {
        "question": args.question,
        "databases": [d.strip() for d in args.databases.split(",") if d.strip()],
        "max_papers": args.max_papers,
        "include_structures": args.structures,
    }
    if args.target:
        params["target"] = args.target
    if args.context:
        params["context"] = args.context
    result = _submit("research", params, run_id=args.run_id)
    _print_submission(result)
    if args.wait:
        console.print(f"\n[dim]Polling every {POLL_INTERVAL}s …[/]")
        final = _poll(result["job_id"])
        _print_status(final)
        report = (final.get("outputs") or {}).get("report_md")
        if report:
            if args.out:
                out = Path(args.out)
                out.mkdir(parents=True, exist_ok=True)
                (out / "research_report.md").write_text(report)
                console.print(f"\n[{_C_SAND}]Report written[/] → {out}/research_report.md")
            else:
                console.print("\n" + "─" * 60)
                console.print(report)
        elif args.out and final.get("status") == "completed":
            _download_job(final, args.out)


def cmd_login(args: argparse.Namespace) -> None:
    """Verify the configured API key and print connection details.

    Tries GET /auth/me first. If that endpoint is not yet deployed (404),
    falls back to a lightweight GET /jobs/ probe to confirm the key is accepted.
    """
    key = _api_key()
    masked = key[:8] + "…" if len(key) > 8 else key
    base = _base_url()

    # Primary: full identity from Clerk
    try:
        me = _request("GET", "/auth/me")
        if args.json:
            print(json.dumps(me, indent=2))
            return

        content = Text()
        content.append("✓ Logged in\n\n", style=f"bold {_C_SAND}")
        content.append("endpoint  ", style="dim")
        content.append(f"{base}\n")
        content.append("API key   ", style="dim")
        content.append(f"{masked}\n\n")
        content.append("Identity\n", style="bold")
        for label, key_name in [
            ("user_id     ", "user_id"),
            ("email       ", "email"),
            ("display_name", "display_name"),
            ("org_id      ", "org_id"),
            ("org_name    ", "org_name"),
        ]:
            val = me.get(key_name) or "—"
            content.append(f"  {label}  ", style="dim")
            content.append(f"{val}\n")
        content.append("\n")
        content.append("Tip: ", style="bold dim")
        content.append("cache these to skip /auth/me on uploads:\n", style="dim")
        content.append(
            f"  export DYNO_USER_ID={me.get('user_id', 'YOUR_USER_ID')}\n",
            style=f"dim {_C_BLUE}",
        )
        content.append(
            f"  export DYNO_ORG_ID={me.get('org_id', 'YOUR_ORG_ID')}",
            style=f"dim {_C_BLUE}",
        )
        console.print(
            Panel(content, title="[bold]Dyno Phi[/]", border_style=_C_BLUE, padding=(1, 2))
        )
        return

    except PhiApiError as exc:
        if "404" not in str(exc):
            _die(str(exc))
        # 404 → endpoint not yet deployed; fall through to probe

    # Fallback: probe the jobs list endpoint to confirm the key is valid
    try:
        _request("GET", "/jobs/?page_size=1")
        if args.json:
            print(json.dumps({"status": "connected", "auth_me": "not_deployed"}, indent=2))
            return

        content = Text()
        content.append("✓ Logged in\n\n", style=f"bold {_C_SAND}")
        content.append("endpoint  ", style="dim")
        content.append(f"{base}\n")
        content.append("API key   ", style="dim")
        content.append(f"{masked}\n\n")
        content.append("Note: ", style="bold dim")
        content.append(
            "User identity will appear here once GET /auth/me is deployed on this environment.",
            style="dim",
        )
        console.print(
            Panel(content, title="[bold]Dyno Phi[/]", border_style=_C_BLUE, padding=(1, 2))
        )

    except PhiApiError as probe_exc:
        msg = f"Authentication failed — {probe_exc}"
        if "401" in str(probe_exc) and key.startswith("ak_"):
            msg += (
                "\n  This endpoint may not yet accept Clerk API keys (ak_…). "
                "Check backend config or use the API that is wired to Clerk."
            )
        _die(msg)


def cmd_status(args: argparse.Namespace) -> None:
    s = _status(args.job_id)
    if args.json:
        print(json.dumps(s, indent=2))
    else:
        _print_status(s)


def cmd_jobs(args: argparse.Namespace) -> None:
    params: dict = {"page_size": args.limit}
    if args.status:
        params["status"] = args.status
    if args.job_type:
        params["job_type"] = args.job_type
    query = "&".join(f"{k}={v}" for k, v in params.items())
    result = _request("GET", f"/jobs/?{query}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    jobs = result.get("jobs", [])
    if not jobs:
        console.print("[dim]No jobs found.[/]")
        return

    table = Table(box=rich_box.SIMPLE_HEAVY, show_header=True, header_style="bold dim")
    table.add_column("JOB ID", style=f"dim {_C_BLUE}", no_wrap=True)
    table.add_column("TYPE", style="bold")
    table.add_column("STATUS", no_wrap=True)
    table.add_column("CREATED", style="dim")

    for j in jobs:
        status = j.get("status", "?")
        color = _STATUS_COLOR.get(status, "")
        styled_status = f"[{color}]{status}[/]" if color else status
        table.add_row(
            j.get("job_id", "?"),
            j.get("job_type", "?"),
            styled_status,
            (j.get("created_at") or "?")[:19],
        )

    console.print(table)
    total = result.get("total_count", len(jobs))
    running = result.get("total_running", 0)
    pending = result.get("total_pending", 0)
    console.print(
        f"[dim]{total} total  ({running} running, {pending} pending)[/]"
    )


def cmd_logs(args: argparse.Namespace) -> None:
    """Stream job logs (prints available log lines; --follow polls for new lines)."""
    url = f"{_base_url()}/api/v1/jobs/{args.job_id}/logs/stream"
    console.print(f"Streaming logs from [{_C_BLUE}]{url}[/]")
    console.print("(Note: EventSource auth requires token as query param on this endpoint)")
    console.print(f"  [dim]curl -N '{url}?x_api_key={_api_key()[:8]}...'[/]")


def cmd_cancel(args: argparse.Namespace) -> None:
    result = _request("DELETE", f"/jobs/{args.job_id}")
    console.print(f"[bold {_C_SAND}]✓[/] Cancel requested: {result.get('message', 'ok')}")


def cmd_download(args: argparse.Namespace) -> None:
    s = _status(args.job_id)
    if s.get("status") != "completed":
        _die(f"Job is '{s.get('status')}' — can only download completed jobs")
    # Fetch richer results (includes artifact_files and workflow_artifacts)
    run_id = s.get("run_id")
    if run_id:
        try:
            results = _request("GET", f"/runs/{run_id}/results")
            s["_results"] = results
        except PhiApiError:
            pass  # Fall back to output_files from status
    _download_job(s, args.out)


# ─────────────────────────── helpers ─────────────────────────────────────────

def _read_fasta(args: argparse.Namespace) -> str:
    if hasattr(args, "fasta_str") and args.fasta_str:
        return args.fasta_str
    if hasattr(args, "fasta") and args.fasta:
        return Path(args.fasta).read_text()
    _die("Provide --fasta FILE or --fasta-str '>name\\nSEQUENCE'")


def _download_job(status: dict, out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Prefer artifact_files from /runs/{run_id}/results over output_files from status
    results = status.get("_results") or {}
    artifact_files = results.get("artifact_files") or []
    workflow_artifacts = results.get("workflow_artifacts") or {}
    output_files = status.get("output_files") or []

    if artifact_files:
        console.print(f"\n[bold]Artifacts[/] ({len(artifact_files)}) — download via signed URL:")
        for af in artifact_files:
            name = af.get("name") or af.get("artifact_id", "?")
            url = af.get("download_url") or af.get("url")
            console.print(f"  [{_C_BLUE}]{name}[/]")
            if url:
                console.print(f"    [dim]{url}[/]")
        manifest = out / "manifest.json"
        manifest.write_text(json.dumps(artifact_files, indent=2))
        console.print(f"  [dim]manifest written →[/] {manifest}")
    elif workflow_artifacts:
        console.print(f"\n[bold]Workflow artifacts:[/]")
        for key, val in workflow_artifacts.items():
            console.print(f"  [{_C_BLUE}]{key}[/]: {val}")
        manifest = out / "manifest.json"
        manifest.write_text(json.dumps(workflow_artifacts, indent=2))
        console.print(f"  [dim]manifest written →[/] {manifest}")
    elif output_files:
        console.print(f"\n[bold]Output files[/] ({len(output_files)}) — stored in GCS:")
        console.print("  [dim](Use: gcloud storage cp gs://... ./ to download)[/]")
        for f in output_files:
            name = f.get("name", "")
            val = f.get("value", "")
            if isinstance(val, list):
                for v in val:
                    console.print(f"  [{_C_BLUE}]{v}[/]")
            else:
                console.print(f"  [{_C_BLUE}]{name}[/]: {val}")
        manifest = out / "manifest.json"
        manifest.write_text(json.dumps(output_files, indent=2))
        console.print(f"  [dim]manifest written →[/] {manifest}")
    else:
        console.print(f"  [dim]No output files found for job {status.get('job_id')}[/]")
        console.print(f"  [dim]run_id: {status.get('run_id')}[/]")
        console.print(f"  Check: [{_C_BLUE}]phi status {status.get('job_id')} --json[/]")


# ─────────────────────────── argument parser ─────────────────────────────────

def _add_fasta_args(p: argparse.ArgumentParser) -> None:
    g = p.add_mutually_exclusive_group()
    g.add_argument("--fasta",       metavar="FILE",
                   help="FASTA file to submit")
    g.add_argument("--fasta-str",   metavar="FASTA",
                   help="FASTA content as a string (for scripting)")
    g.add_argument("--dataset-id",  metavar="DATASET_ID",
                   help="Pre-ingested dataset ID (for batch runs of 100–50,000 files)")


def _add_pdb_args(p: argparse.ArgumentParser) -> None:
    g = p.add_mutually_exclusive_group()
    g.add_argument("--pdb",         metavar="FILE",    help="PDB structure file")
    g.add_argument("--pdb-gcs",     metavar="GCS_URI", help="GCS URI to PDB (gs://…)")
    g.add_argument("--dataset-id",  metavar="DATASET_ID",
                   help="Pre-ingested dataset ID (for batch runs of 100–50,000 files)")


def _add_job_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--run-id",  metavar="ID",   help="Optional run label")
    p.add_argument("--wait",    action="store_true", default=True,
                   help="Poll until job completes (default: on)")
    p.add_argument("--no-wait", action="store_false", dest="wait",
                   help="Return immediately after submission")
    p.add_argument("--out",     metavar="DIR",  help="Download results to DIR when done")
    p.add_argument("--json",    action="store_true", help="Output raw JSON")


def build_parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        prog="phi",
        description="Dyno Phi protein design platform CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = root.add_subparsers(dest="command", required=True)

    # ── login ─────────────────────────────────────────────────────────────────
    p = sub.add_parser("login", help="Verify API key and print connection + identity details")
    p.add_argument("--json", action="store_true")

    # ── upload ────────────────────────────────────────────────────────────────
    p = sub.add_parser(
        "upload",
        help="Upload files → ingest → dataset (batch workflow entry point)",
    )
    p.add_argument("files", nargs="*", metavar="FILE",
                   help="Files to upload (positional). Use --dir for directories.")
    p.add_argument("--dir",       metavar="DIR",
                   help="Upload all matching files in this directory")
    p.add_argument("--file-type", metavar="TYPE", choices=["pdb", "fasta", "csv"],
                   help="Filter --dir scan by extension: pdb, fasta, csv")
    p.add_argument("--gcs",       metavar="GCS_URI",
                   help="[Future] Import from external GCS bucket (gs://bucket/prefix/)")
    p.add_argument("--run-id",    metavar="ID", help="Label for this ingest session")
    p.add_argument("--wait",      action="store_true", default=True,
                   help="Poll until dataset is READY (default: on)")
    p.add_argument("--no-wait",   action="store_false", dest="wait",
                   help="Return after finalizing without polling")

    # ── datasets ──────────────────────────────────────────────────────────────
    p = sub.add_parser("datasets", help="List your datasets")
    p.add_argument("--limit", type=int, default=20, metavar="N")
    p.add_argument("--json",  action="store_true")

    # ── dataset ───────────────────────────────────────────────────────────────
    p = sub.add_parser("dataset", help="Show details for a dataset")
    p.add_argument("dataset_id")
    p.add_argument("--json", action="store_true")

    p = sub.add_parser("ingest-session", help="Show status of an ingest session")
    p.add_argument("session_id", metavar="SESSION_ID")
    p.add_argument("--json", action="store_true")

    # ── esmfold ───────────────────────────────────────────────────────────────
    p = sub.add_parser("esmfold", help="Fast structure prediction (~1 min)")
    _add_fasta_args(p)
    p.add_argument("--recycles",      type=int, default=3, metavar="N",
                   help="Recycling iterations (default: 3)")
    p.add_argument("--no-confidence", action="store_true",
                   help="Skip per-residue pLDDT extraction")
    p.add_argument("--fasta-name",    metavar="NAME",
                   help="Name label for output files (single-sequence mode only)")
    _add_job_args(p)

    # ── alphafold ─────────────────────────────────────────────────────────────
    p = sub.add_parser("alphafold", help="Structure prediction — monomer or multimer (8–15 min)")
    _add_fasta_args(p)
    p.add_argument("--models",    default="1,2,3", metavar="1,2,3",
                   help="Model numbers to run (default: 1,2,3)")
    p.add_argument("--recycles",  type=int, default=3, metavar="N",
                   help="Recycling iterations (default: 3; use 6 for final validation)")
    p.add_argument("--relax",     type=int, default=0, metavar="N",
                   help="Amber relaxation passes (default: 0)")
    p.add_argument("--templates", action="store_true", help="Use PDB templates")
    _add_job_args(p)

    # ── proteinmpnn ───────────────────────────────────────────────────────────
    p = sub.add_parser("proteinmpnn", help="Sequence design via inverse folding (1–2 min)")
    _add_pdb_args(p)
    p.add_argument("--num-sequences", type=int, default=10, metavar="N",
                   help="Sequences to design (default: 10)")
    p.add_argument("--temperature",   type=float, default=0.1, metavar="T",
                   help="Sampling temperature 0–1 (default: 0.1)")
    p.add_argument("--fixed",         metavar="A52,A56",
                   help="Fixed residue positions e.g. A52,A56,A63")
    _add_job_args(p)

    # ── esm2 ──────────────────────────────────────────────────────────────────
    p = sub.add_parser("esm2", help="Language model scoring: log-likelihood and perplexity")
    _add_fasta_args(p)
    p.add_argument("--mask", metavar="5,10,15",
                   help="Comma-separated positions to mask for scoring")
    _add_job_args(p)

    # ── boltz ─────────────────────────────────────────────────────────────────
    p = sub.add_parser("boltz", help="Biomolecular complex prediction — proteins, DNA, RNA")
    _add_fasta_args(p)
    p.add_argument("--recycles", type=int, default=3, metavar="N")
    p.add_argument("--no-msa",   action="store_true",
                   help="Disable MSA (faster, lower accuracy)")
    _add_job_args(p)

    # ── research ──────────────────────────────────────────────────────────────
    p = sub.add_parser("research", help="Biological research query with citations (2–5 min)")
    p.add_argument("--question",   required=True, metavar="QUESTION",
                   help="Research question, e.g. 'What are known binding hotspots for PD-L1?'")
    p.add_argument("--target",     metavar="TARGET",
                   help="Protein or gene name to focus the search (e.g. PD-L1, KRAS, EGFR)")
    p.add_argument("--databases",  default="pubmed,uniprot,pdb",
                   metavar="pubmed,uniprot,pdb",
                   help="Comma-separated databases to query (default: pubmed,uniprot,pdb)")
    p.add_argument("--max-papers", type=int, default=20, metavar="N",
                   help="Maximum papers to retrieve from PubMed (default: 20)")
    p.add_argument("--structures", action="store_true",
                   help="Include related PDB structures in report")
    p.add_argument("--context",    metavar="TEXT",
                   help="Additional context for the research query")
    _add_job_args(p)

    # ── job management ────────────────────────────────────────────────────────
    p = sub.add_parser("status", help="Get job status")
    p.add_argument("job_id")
    p.add_argument("--json", action="store_true")

    p = sub.add_parser("jobs", help="List recent jobs")
    p.add_argument("--limit",    type=int, default=20, metavar="N")
    p.add_argument("--status",   metavar="STATUS",
                   choices=["pending", "running", "completed", "failed", "cancelled"])
    p.add_argument("--job-type", metavar="TYPE")
    p.add_argument("--json",     action="store_true")

    p = sub.add_parser("logs", help="Print log stream URL for a job")
    p.add_argument("job_id")
    p.add_argument("--follow", action="store_true")

    p = sub.add_parser("cancel", help="Cancel a running job")
    p.add_argument("job_id")

    p = sub.add_parser("download", help="Download output files for a completed job")
    p.add_argument("job_id")
    p.add_argument("--out", default="./results", metavar="DIR")

    return root


COMMANDS = {
    "login":          cmd_login,
    "upload":         cmd_upload,
    "ingest-session": cmd_ingest_session,
    "datasets":       cmd_datasets,
    "dataset":        cmd_dataset,
    "esmfold":     cmd_esmfold,
    "alphafold":   cmd_alphafold,
    "proteinmpnn": cmd_proteinmpnn,
    "esm2":        cmd_esm2,
    "boltz":       cmd_boltz,
    "research":    cmd_research,
    "status":      cmd_status,
    "jobs":        cmd_jobs,
    "logs":        cmd_logs,
    "cancel":      cmd_cancel,
    "download":    cmd_download,
}


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        COMMANDS[args.command](args)
    except PhiApiError as exc:
        _die(str(exc))


if __name__ == "__main__":
    main()
