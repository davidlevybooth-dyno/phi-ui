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
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import NoReturn, TypedDict


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
INGEST_TERMINAL    = {"READY", "FAILED"}
UPLOAD_BATCH_SIZE  = 50    # filenames per signed-URL request
UPLOAD_WORKERS     = 8     # parallel upload threads


def _base_url() -> str:
    return os.environ.get("DYNO_API_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


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
    print(f"error: {msg}", file=sys.stderr)
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read())
        except Exception:
            detail = e.reason
        raise PhiApiError(f"HTTP {e.code} — {detail}") from e
    except urllib.error.URLError as e:
        raise PhiApiError(f"Network error — {e.reason}") from e


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
            with urllib.request.urlopen(req, timeout=300) as resp:
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


def _poll(job_id: str, quiet: bool = False) -> dict:
    """Poll until terminal status and return final status object."""
    start = time.time()
    while time.time() - start < POLL_TIMEOUT:
        s = _status(job_id)
        status = s.get("status", "unknown")
        progress = s.get("progress") or {}
        pct = progress.get("percent_complete", 0)
        step = progress.get("current_step", "")
        if not quiet:
            elapsed = int(time.time() - start)
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
    print(f"✓ Job submitted")
    print(f"  job_id : {result.get('job_id')}")
    print(f"  run_id : {result.get('run_id')}")
    print(f"  status : {result.get('status')}")
    if result.get("message"):
        print(f"  message: {result['message']}")


def _print_status(s: dict) -> None:
    status = s.get("status", "?")
    icon = {"completed": "✓", "failed": "✗", "cancelled": "⊘"}.get(status, "·")
    print(f"{icon} {s.get('job_id')}  [{status}]")
    if s.get("error"):
        print(f"  error : {s['error']}")
    p = s.get("progress") or {}
    if p.get("current_step"):
        print(f"  step  : {p['current_step']}")
    if s.get("completed_at") and s.get("started_at"):
        print(f"  timing: {s['started_at']} → {s['completed_at']}")
    files = s.get("output_files") or []
    if files:
        print(f"  files : {len(files)} output file(s)")
        for f in files[:5]:
            name = f.get("filename") or f.get("gcs_url", "?")
            print(f"          {name}")
        if len(files) > 5:
            print(f"          … {len(files) - 5} more")


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
    """Poll an ingest session until READY or FAILED."""
    start = time.time()
    while time.time() - start < POLL_TIMEOUT:
        s = _request("GET", f"/ingest_sessions/{session_id}")
        status = s.get("status", "UNKNOWN")
        uploaded = s.get("uploaded_files", 0)
        expected = s.get("expected_files", "?")
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
        print(f"\nPolling every {POLL_INTERVAL}s …")
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
    session: IngestSessionResponse = _request("POST", "/ingest_sessions", body)
    # Accept either "session_id" or "id" as the session identifier
    session_id = session.get("session_id") or session.get("id")
    if not session_id:
        _die(f"POST /ingest_sessions response missing 'session_id': {session}")
    print(f"  session_id : {session_id}")
    return session_id


def _request_signed_urls(session_id: str, files: list[Path]) -> dict[str, str]:
    """Request signed upload URLs for all files; returns filename → URL mapping."""
    total = len(files)
    batches = [files[i:i + UPLOAD_BATCH_SIZE] for i in range(0, total, UPLOAD_BATCH_SIZE)]
    print(f"  Requesting signed URLs ({len(batches)} batch(es) of ≤{UPLOAD_BATCH_SIZE}) …")
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
    print(f"  Uploading {total} file(s) with {UPLOAD_WORKERS} parallel workers …")
    completed = 0
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

    with ThreadPoolExecutor(max_workers=UPLOAD_WORKERS) as pool:
        futures = {pool.submit(_upload_one, p): p for p in files}
        for future in as_completed(futures):
            name, ok, err = future.result()
            completed += 1
            if ok:
                if completed % 50 == 0 or completed == total:
                    print(f"  [{completed:>6}/{total}] uploaded")
            else:
                failures.append(f"{name}: {err}")
                print(f"  ✗ {name}: {err}")

    return failures


def _print_dataset_ready(dataset_id: str | None, artifact_count: int) -> None:
    print(f"\n✓ Dataset ready")
    print(f"  dataset_id     : {dataset_id}")
    print(f"  artifact_count : {artifact_count}")
    print(f"\n  Run a job against this dataset:")
    print(f"    phi esmfold     --dataset-id {dataset_id}")
    print(f"    phi alphafold   --dataset-id {dataset_id}")
    print(f"    phi proteinmpnn --dataset-id {dataset_id}")


def cmd_upload(args: argparse.Namespace) -> None:
    """Upload local files → staged ingest → versioned dataset."""
    if getattr(args, "gcs", None):
        print("  External GCS import is not yet available.")
        print("  The backend import worker is planned — see backend-api-gaps.md §9.")
        print(f"  When available: phi upload --gcs {args.gcs}")
        return

    files = _collect_files(args)
    print(f"✓ Found {len(files)} file(s) to upload")

    session_id = _create_ingest_session(files, args)
    url_map = _request_signed_urls(session_id, files)

    failures = _upload_all_parallel(files, url_map)
    if failures:
        print(f"\nerror: {len(failures)} upload(s) failed:")
        for msg in failures[:10]:
            print(f"  {msg}")
        _die("Upload incomplete — fix errors and retry.")

    print(f"  ✓ All {len(files)} file(s) uploaded successfully")

    print("  Finalizing ingest session …")
    _request("POST", f"/ingest_sessions/{session_id}/finalize", {})

    if args.wait:
        print(f"\nIngesting and validating files (polling every {POLL_INTERVAL}s) …")
        result = _ingest_poll(session_id)
        status = result.get("status")
        if status == "READY":
            _print_dataset_ready(result.get("dataset_id"), result.get("artifact_count", len(files)))
        else:
            _die(f"Ingest failed ({status}): {result.get('error', 'unknown error')}")
    else:
        print(f"\n✓ Session finalized — ingestion running in background")
        print(f"  session_id: {session_id}")
        print(f"  Check status: phi dataset-session {session_id}")


def cmd_datasets(args: argparse.Namespace) -> None:
    """List datasets owned by the current user."""
    params = f"?page_size={args.limit}"
    result = _request("GET", f"/datasets{params}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    datasets = result.get("datasets", [])
    if not datasets:
        print("No datasets found.")
        return
    print(f"{'DATASET ID':<30}  {'ARTIFACTS':>10}  {'STATUS':<10}  CREATED")
    print("─" * 72)
    for d in datasets:
        print(
            f"{d.get('dataset_id', '?'):<30}  "
            f"{d.get('artifact_count', '?'):>10}  "
            f"{d.get('status', '?'):<10}  "
            f"{str(d.get('created_at', '?'))[:19]}"
        )
    print(f"\n{result.get('total_count', len(datasets))} total dataset(s)")


def cmd_dataset(args: argparse.Namespace) -> None:
    """Show details for a specific dataset."""
    result = _request("GET", f"/datasets/{args.dataset_id}")
    if args.json:
        print(json.dumps(result, indent=2))
        return
    print(f"dataset_id     : {result.get('dataset_id')}")
    print(f"status         : {result.get('status')}")
    print(f"artifact_count : {result.get('artifact_count')}")
    print(f"version        : {result.get('version', 1)}")
    print(f"created_at     : {result.get('created_at', '')[:19]}")
    manifest = result.get("manifest_uri")
    if manifest:
        print(f"manifest_uri   : {manifest}")
    artifacts = result.get("sample_artifacts") or []
    if artifacts:
        print(f"\nSample artifacts (first {len(artifacts)}):")
        for a in artifacts:
            print(f"  {a.get('artifact_id', '?'):<20}  {a.get('source_filename', '?'):<30}  {a.get('size', 0):>8} B")
    print(f"\nRun a job:")
    print(f"  phi esmfold   --dataset-id {result.get('dataset_id')}")
    print(f"  phi alphafold --dataset-id {result.get('dataset_id')}")


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
            print(f"  multimer mode detected ({fasta_str.count(':') + 1} chains)")
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
        print(f"\nPolling every {POLL_INTERVAL}s …")
        final = _poll(result["job_id"])
        _print_status(final)
        report = (final.get("outputs") or {}).get("report_md")
        if report:
            if args.out:
                out = Path(args.out)
                out.mkdir(parents=True, exist_ok=True)
                (out / "research_report.md").write_text(report)
                print(f"\nReport written → {out}/research_report.md")
            else:
                print("\n" + "─" * 60)
                print(report)
        elif args.out and final.get("status") == "completed":
            _download_job(final, args.out)


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
        print("No jobs found.")
        return
    print(f"{'JOB ID':<38}  {'TYPE':<14}  {'STATUS':<12}  CREATED")
    print("─" * 88)
    for j in jobs:
        print(
            f"{j.get('job_id', '?'):<38}  "
            f"{j.get('job_type', '?'):<14}  "
            f"{j.get('status', '?'):<12}  "
            f"{j.get('created_at', '?')[:19]}"
        )
    print(f"\n{result.get('total_count', len(jobs))} total  "
          f"({result.get('total_running', 0)} running, "
          f"{result.get('total_pending', 0)} pending)")


def cmd_logs(args: argparse.Namespace) -> None:
    """Stream job logs (prints available log lines; --follow polls for new lines)."""
    url = f"{_base_url()}/api/v1/jobs/{args.job_id}/logs/stream"
    print(f"Streaming logs from {url}")
    print("(Note: EventSource auth requires token as query param on this endpoint)")
    print(f"  curl -N '{url}?x_api_key={_api_key()[:8]}...'")


def cmd_cancel(args: argparse.Namespace) -> None:
    result = _request("DELETE", f"/jobs/{args.job_id}")
    print(f"✓ Cancel requested: {result.get('message', 'ok')}")


def cmd_download(args: argparse.Namespace) -> None:
    s = _status(args.job_id)
    if s.get("status") != "completed":
        _die(f"Job is '{s.get('status')}' — can only download completed jobs")
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
    files = status.get("output_files") or []
    if not files:
        print(f"  No output files listed for job {status.get('job_id')}")
        return
    print(f"\nDownloading {len(files)} file(s) to {out}/")
    print("  (GCS URIs require gcloud auth — run: gcloud auth application-default login)")
    for f in files:
        gcs = f.get("gcs_url") or f.get("storage_path")
        name = f.get("filename") or Path(str(gcs)).name if gcs else None
        if name:
            print(f"  gs://{gcs}" if gcs else f"  {name}")
    # Write a manifest for easy reference
    manifest = out / "manifest.json"
    manifest.write_text(json.dumps(files, indent=2))
    print(f"  manifest written → {manifest}")


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
    "upload":      cmd_upload,
    "datasets":    cmd_datasets,
    "dataset":     cmd_dataset,
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
