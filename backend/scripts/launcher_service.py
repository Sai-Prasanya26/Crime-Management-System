"""
Crime Intelligence & Management Portal - Launcher Verification Service
Handles pre-flight checks, port conflict inspection, database readiness,
backend health monitoring, and frontend readiness.
"""

import sys
import os
import time
import socket
import subprocess
import json
import urllib.request
import urllib.error
from typing import Optional, Tuple


def get_pid_on_port(port: int) -> Optional[int]:
    """Inspects Windows netstat to discover process ID listening on a TCP port."""
    try:
        out = subprocess.check_output(
            "netstat -ano -p tcp", shell=True, text=True, stderr=subprocess.DEVNULL
        )
        for line in out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[0].upper() == "TCP":
                local_addr = parts[1]
                state = parts[3]
                pid = parts[4]
                if local_addr.endswith(f":{port}") and state.upper() == "LISTENING":
                    return int(pid)
    except Exception:
        pass
    return None


def is_port_listening(host: str, port: int, timeout: float = 1.0) -> bool:
    """Checks if a TCP port is accepting socket connections."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        res = s.connect_ex((host, port))
        s.close()
        return res == 0
    except Exception:
        s.close()
        return False


def is_cms_backend_listening() -> Tuple[bool, Optional[int]]:
    """Checks if port 8000 is listening and belongs to CMS FastAPI backend."""
    pid = get_pid_on_port(8000)
    if not is_port_listening("127.0.0.1", 8000):
        return False, None

    # Check if the process responds as our FastAPI server
    for path in ["/health", "/api/v1/health", "/api/v1/docs"]:
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:8000{path}", headers={"User-Agent": "CMS-Launcher/1.0"}
            )
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                if resp.status in (200, 503):
                    return True, pid
        except urllib.error.HTTPError as e:
            if e.code in (200, 503):
                return True, pid
        except Exception:
            pass

    return False, pid


def is_backend_healthy(timeout: float = 2.0) -> bool:
    """Checks if FastAPI backend is online AND confirms database connectivity."""
    url = "http://127.0.0.1:8000/api/v1/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CMS-Launcher/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return (
                    data.get("status") == "ok"
                    and data.get("database") == "connected"
                    and data.get("tables_verified") is True
                )
    except Exception:
        pass
    return False


def is_cms_frontend_listening() -> Tuple[bool, Optional[int]]:
    """Checks if port 5174 is listening and serves Vite/CMS frontend."""
    pid = get_pid_on_port(5174)
    if not is_port_listening("127.0.0.1", 5174):
        return False, None
    try:
        req = urllib.request.Request(
            "http://localhost:5174", headers={"User-Agent": "CMS-Launcher/1.0"}
        )
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                return True, pid
    except Exception:
        pass
    return False, pid


def is_frontend_healthy(timeout: float = 2.0) -> bool:
    """Checks if Vite frontend is responding with HTTP 200."""
    return is_cms_frontend_listening()[0]


def check_port_conflicts() -> bool:
    """
    Checks if ports 8000 or 5174 are occupied by foreign/unrelated applications.
    If occupied by CMS services, it's NOT a conflict.
    """
    has_conflict = False

    # Check Port 8000
    if is_port_listening("127.0.0.1", 8000):
        is_cms, pid = is_cms_backend_listening()
        if not is_cms:
            pid_str = f" (PID: {pid})" if pid else ""
            print(f"[ERROR] Port 8000 is already occupied by an unrelated process{pid_str}.")
            print("        Please close the conflicting application or stop the process before launching.")
            has_conflict = True

    # Check Port 5174
    if is_port_listening("127.0.0.1", 5174):
        is_cms, pid = is_cms_frontend_listening()
        if not is_cms:
            pid_str = f" (PID: {pid})" if pid else ""
            print(f"[ERROR] Port 5174 is already occupied by an unrelated process{pid_str}.")
            print("        Please close the conflicting application or stop the process before launching.")
            has_conflict = True

    return not has_conflict


def verify_database(timeout_seconds: int = 15) -> bool:
    """
    Verifies that MySQL server is listening, database connection succeeds with
    project credentials from .env/settings, and essential schema tables and data are available.
    Never exposes passwords.
    """
    try:
        from backend.app.core.config import settings
        from sqlalchemy import create_engine, text
    except Exception as exc:
        print(f"[ERROR] Failed to load backend configuration: {exc}")
        return False

    db_host = settings.MYSQL_HOST
    db_port = settings.MYSQL_PORT
    db_name = settings.MYSQL_DATABASE
    db_url = settings.DATABASE_URL

    connect_host = "127.0.0.1" if db_host == "localhost" else db_host

    # 1. First verify socket listening
    if not is_port_listening(connect_host, db_port, timeout=2.0):
        print(f"[ERROR] MySQL is not accepting connections on {db_host}:{db_port}.")
        return False

    required_tables = [
        "users",
        "states",
        "districts",
        "crime_incidents",
        "official_crime_statistics",
        "district_geography_mapping",
    ]

    start_time = time.time()
    last_error = None

    while time.time() - start_time < timeout_seconds:
        try:
            engine = create_engine(
                db_url, pool_pre_ping=True, connect_args={"connect_timeout": 5}
            )
            with engine.connect() as conn:
                # 1. Connectivity test
                conn.execute(text("SELECT 1;"))

                # 2. Database name check
                current_db = conn.execute(text("SELECT DATABASE();")).scalar()
                if not current_db or current_db.lower() != db_name.lower():
                    print(
                        f"[ERROR] Connected to unexpected database '{current_db}', expected project database '{db_name}'."
                    )
                    return False

                # 3. Required tables check
                tables_res = conn.execute(text("SHOW TABLES;")).fetchall()
                existing_tables = set(row[0].lower() for row in tables_res if row[0])
                missing = [t for t in required_tables if t.lower() not in existing_tables]
                if missing:
                    print(
                        f"[ERROR] Required database tables missing in {db_name}: {', '.join(missing)}"
                    )
                    return False

                # 4. Verify baseline record presence
                incidents_count = (
                    conn.execute(text("SELECT COUNT(*) FROM crime_incidents;")).scalar() or 0
                )
                districts_count = (
                    conn.execute(text("SELECT COUNT(*) FROM districts;")).scalar() or 0
                )
                states_count = (
                    conn.execute(text("SELECT COUNT(*) FROM states;")).scalar() or 0
                )
                users_count = conn.execute(text("SELECT COUNT(*) FROM users;")).scalar() or 0

                if incidents_count == 0:
                    print(
                        f"[ERROR] Database {db_name} contains 0 crime incidents. Data verification failed."
                    )
                    return False

                print(f"[OK] {db_name} connected")
                print(
                    f"[OK] Required schema verified ({incidents_count:,} incidents, {districts_count} districts, {states_count} states/UTs, {users_count} users)"
                )
                return True
        except Exception as exc:
            last_error = exc
            time.sleep(1)

    # Safe error message without exposing passwords
    err_str = str(last_error) if last_error else "Connection timeout"
    if "Access denied" in err_str:
        print("[ERROR] MySQL authentication failed for configured database user.")
        print("        Please verify the DB credentials in .env file.")
    elif "Unknown database" in err_str:
        print(f"[ERROR] Configured database '{db_name}' does not exist on MySQL server.")
    else:
        print(f"[ERROR] Database connection failed after {timeout_seconds}s.")
        print(f"        Reason: {type(last_error).__name__}")
    return False


def wait_backend_health(timeout_seconds: int = 60) -> bool:
    """
    Polls /api/v1/health until HTTP 200 with database verified or timeout.
    """
    url = "http://127.0.0.1:8000/api/v1/health"
    start_time = time.time()
    printed_notice = False

    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CMS-Launcher/1.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    if (
                        data.get("status") == "ok"
                        and data.get("database") == "connected"
                        and data.get("tables_verified") is True
                    ):
                        print("[OK] Backend ready")
                        print(
                            f"[OK] Database health check passed (Database: {data.get('database_name', 'connected')})"
                        )
                        print("      http://127.0.0.1:8000")
                        return True
                    else:
                        print(
                            f"[*] Backend online, waiting for database readiness ({data.get('status')})..."
                        )
        except urllib.error.HTTPError as e:
            if not printed_notice:
                print("[*] Waiting for backend and database connection...")
                printed_notice = True
        except Exception:
            if not printed_notice:
                print("[*] Waiting for backend server...")
                printed_notice = True
        time.sleep(2)

    print(f"[ERROR] Backend health check timed out after {timeout_seconds} seconds.")
    print("        FastAPI did not confirm healthy database connectivity.")
    return False


def wait_frontend_ready(timeout_seconds: int = 60) -> bool:
    """
    Polls http://localhost:5174 until HTTP 200 is returned or timeout.
    """
    url = "http://localhost:5174"
    start_time = time.time()
    printed_notice = False

    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CMS-Launcher/1.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    print("[OK] Frontend ready")
                    print(f"      {url}")
                    return True
        except Exception:
            if not printed_notice:
                print("[*] Waiting for frontend development server...")
                printed_notice = True
        time.sleep(2)

    print(f"[ERROR] Frontend failed to respond with HTTP 200 within {timeout_seconds} seconds.")
    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: launcher_service.py <command>")
        print(
            "Commands: check-ports, verify-db, is-project-running, is-backend-running, is-frontend-running, wait-backend, wait-frontend"
        )
        sys.exit(1)

    cmd = sys.argv[1].lower()

    if cmd == "check-ports":
        success = check_port_conflicts()
        sys.exit(0 if success else 1)

    elif cmd == "verify-db":
        timeout = 15
        if len(sys.argv) > 2:
            try:
                timeout = int(sys.argv[2])
            except ValueError:
                pass
        success = verify_database(timeout)
        sys.exit(0 if success else 1)

    elif cmd == "is-project-running":
        # Both backend healthy (with DB) and frontend healthy
        running = is_backend_healthy() and is_frontend_healthy()
        sys.exit(0 if running else 1)

    elif cmd == "is-backend-running":
        # Check if backend is listening AND healthy
        running = is_backend_healthy()
        sys.exit(0 if running else 1)

    elif cmd == "is-backend-process-up":
        # Check if backend process is listening (even if DB is 503)
        listening, _ = is_cms_backend_listening()
        sys.exit(0 if listening else 1)

    elif cmd == "is-frontend-running":
        running = is_frontend_healthy()
        sys.exit(0 if running else 1)

    elif cmd == "wait-backend":
        timeout = 60
        if len(sys.argv) > 2:
            try:
                timeout = int(sys.argv[2])
            except ValueError:
                pass
        success = wait_backend_health(timeout)
        sys.exit(0 if success else 1)

    elif cmd == "wait-frontend":
        timeout = 60
        if len(sys.argv) > 2:
            try:
                timeout = int(sys.argv[2])
            except ValueError:
                pass
        success = wait_frontend_ready(timeout)
        sys.exit(0 if success else 1)

    else:
        print(f"[ERROR] Unknown command '{cmd}'")
        sys.exit(1)


if __name__ == "__main__":
    main()
