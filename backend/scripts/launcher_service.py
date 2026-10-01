"""
Crime Intelligence & Management Portal - Launcher Verification Service
Robust process orchestration, port conflict checking, database verification,
and health synchronization without tracebacks.
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
    """Checks if a TCP port is accepting socket connections (IPv4 and IPv6)."""
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return True
    except Exception:
        return False


def is_cms_backend_healthy(timeout: float = 2.0) -> bool:
    """Checks if FastAPI backend is responding AND confirms database connectivity."""
    if not is_port_listening("127.0.0.1", 8000, timeout=1.0):
        return False

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


def is_cms_backend_process() -> Tuple[bool, Optional[int]]:
    """Checks if port 8000 is listening and belongs to our CMS backend (even if booting or 503)."""
    pid = get_pid_on_port(8000)
    if not is_port_listening("127.0.0.1", 8000, timeout=1.0):
        return False, None

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


def is_cms_frontend_responding(timeout: float = 2.0) -> bool:
    """Checks if Vite frontend on port 5174 is responding with HTTP 200."""
    if not is_port_listening("localhost", 5174, timeout=1.0):
        return False

    url = "http://localhost:5174"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CMS-Launcher/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        pass
    return False


def check_port_conflicts() -> bool:
    """
    Checks if ports 8000 or 5174 are occupied by foreign/unrelated applications.
    If occupied by CMS services, it's NOT a conflict.
    """
    has_conflict = False

    # Check Port 8000
    if is_port_listening("127.0.0.1", 8000, timeout=1.0):
        is_cms, pid = is_cms_backend_process()
        if not is_cms:
            pid_str = f"PID: {pid}" if pid else "PID: Unknown"
            print(f"[ERROR] Port 8000 is occupied by another application.")
            print(f"        {pid_str}")
            print("        Please close the conflicting application before starting.")
            has_conflict = True

    # Check Port 5174
    if is_port_listening("localhost", 5174, timeout=1.0):
        if not is_cms_frontend_responding():
            pid = get_pid_on_port(5174)
            pid_str = f"PID: {pid}" if pid else "PID: Unknown"
            print(f"[ERROR] Port 5174 is occupied by another application.")
            print(f"        {pid_str}")
            print("        Please close the conflicting application before starting.")
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

                # 4. Verify baseline record presence (without hardcoding specific numbers)
                incidents_count = (
                    conn.execute(text("SELECT COUNT(*) FROM crime_incidents;")).scalar() or 0
                )
                users_count = conn.execute(text("SELECT COUNT(*) FROM users;")).scalar() or 0

                if incidents_count == 0:
                    print(
                        f"[ERROR] Database {db_name} contains 0 crime incidents. Data verification failed."
                    )
                    return False

                print(f"[OK] {db_name} connected")
                print("[OK] Required schema verified")
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
    Synchronized backend waiter:
    1. Waits for TCP port 8000 to listen.
    2. Polls GET /api/v1/health until status=ok, database=connected, tables_verified=true.
    Never prints a Python traceback during retries.
    """
    url = "http://127.0.0.1:8000/api/v1/health"
    print("[*] Waiting for backend...")

    start_time = time.time()
    attempt = 0

    while time.time() - start_time < timeout_seconds:
        attempt += 1

        # Step A: Check if TCP port 8000 is open
        if is_port_listening("127.0.0.1", 8000, timeout=1.0):
            # Step B: Port is open, test health endpoint
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "CMS-Launcher/1.0"}
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        if (
                            data.get("status") == "ok"
                            and data.get("database") == "connected"
                            and data.get("tables_verified") is True
                        ):
                            print("[OK] FastAPI backend is healthy")
                            print("[OK] Database health check passed")
                            return True
            except urllib.error.HTTPError as e:
                # 503 or degraded while database connects
                pass
            except Exception:
                # Connection reset, refused, timeout during reboot - expected
                pass

        print(f"[.] Backend not ready yet... retry {attempt}/{timeout_seconds}")
        time.sleep(1)

    print()
    print("=" * 60)
    print("FASTAPI BACKEND STARTUP FAILED")
    print("=" * 60)
    print("Port:")
    print("8000")
    print()
    print("Health URL:")
    print("http://127.0.0.1:8000/api/v1/health")
    print()
    print(f"The backend process did not become healthy within {timeout_seconds} seconds.")
    print("Check the \"CMS - FastAPI Backend\" terminal for the actual startup error.")
    print("Project startup has been stopped.")
    print("=" * 60)
    return False


def wait_frontend_ready(timeout_seconds: int = 60) -> bool:
    """
    Synchronized frontend waiter:
    1. Waits for TCP port 5174 to listen.
    2. Polls http://localhost:5174 until HTTP 200 is returned.
    Never prints a Python traceback during retries.
    """
    url = "http://localhost:5174"
    print("[*] Waiting for frontend...")

    start_time = time.time()
    attempt = 0

    while time.time() - start_time < timeout_seconds:
        attempt += 1

        if is_port_listening("localhost", 5174, timeout=1.0):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "CMS-Launcher/1.0"}
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.status == 200:
                        print("[OK] Frontend is responding")
                        return True
            except Exception:
                pass

        print(f"[.] Frontend not ready yet... retry {attempt}/{timeout_seconds}")
        time.sleep(1)

    print()
    print("=" * 60)
    print("FRONTEND STARTUP FAILED")
    print("=" * 60)
    print("Port:")
    print("5174")
    print()
    print("Frontend URL:")
    print("http://localhost:5174")
    print()
    print(f"The frontend dev server did not respond within {timeout_seconds} seconds.")
    print("Check the \"CMS - Vite Frontend\" terminal for the actual startup error.")
    print("Project startup has been stopped.")
    print("=" * 60)
    return False


def main():
    try:
        if len(sys.argv) < 2:
            print("Usage: launcher_service.py <command>")
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
            running = is_cms_backend_healthy() and is_cms_frontend_responding()
            sys.exit(0 if running else 1)

        elif cmd == "is-backend-healthy":
            healthy = is_cms_backend_healthy()
            sys.exit(0 if healthy else 1)

        elif cmd == "is-frontend-healthy":
            healthy = is_cms_frontend_responding()
            sys.exit(0 if healthy else 1)

        elif cmd == "is-port-listening":
            if len(sys.argv) < 3:
                sys.exit(1)
            port = int(sys.argv[2])
            listening = is_port_listening("127.0.0.1", port)
            sys.exit(0 if listening else 1)

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

    except SystemExit:
        raise
    except (KeyboardInterrupt, Exception):
        sys.exit(1)


if __name__ == "__main__":
    main()
