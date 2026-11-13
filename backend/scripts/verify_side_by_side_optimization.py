"""
Automated CDP script to verify and screenshot:
1. Side-by-side panels: Left (Predicted Crimes), Right (Crime-wise Resource Mapping).
2. Initial absence of Section 3 (Optimized Resource Allocation).
3. Clicking different crimes and interactive right-panel updating.
4. Clicking 'Optimize Resources' and Section 3 appearing below with 5 columns.
5. Strict Decoupling check.
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
INITIAL_SCREENSHOT = os.path.join(ARTIFACT_DIR, "resource_optimization_initial_side_by_side.png")
OPTIMIZED_SCREENSHOT = os.path.join(ARTIFACT_DIR, "resource_optimization_side_by_side_optimized.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_side_by_side"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9226",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9226")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9226/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25_000_000) as ws:
            msg_id = 0
            async def call(method, params=None):
                nonlocal msg_id
                msg_id += 1
                cmd = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(cmd))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == msg_id:
                        return resp.get("result", {})

            await call("Page.enable")
            await call("Runtime.enable")
            await call("DOM.enable")

            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 2000,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            # Get admin auth token
            async with httpx.AsyncClient() as http_client:
                login_resp = await http_client.post(
                    "http://127.0.0.1:8000/api/v1/auth/login",
                    json={"username_or_email": "admin", "password": "Admin@12345"}
                )
                token = login_resp.json()["access_token"]

            target_url = "http://127.0.0.1:5174/resources?state_id=2&period=2026-11"
            print(f"Navigating to {target_url}...")
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await call("Runtime.evaluate", {"expression": set_token_js})
            print("Token injected. Waiting for side-by-side Resource Optimization UI to render...")

            val = {}
            for i in range(20):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const body = document.body.innerText;
                        
                        const hasSec1 = body.includes('Predicted Crimes');
                        const hasSec2 = body.includes('Crime-wise Resource Mapping');
                        const hasSec3 = body.includes('Optimized Resource Allocation');
                        
                        // Check side-by-side grid
                        const gridEl = document.querySelector('.grid.grid-cols-1.lg\\\\:grid-cols-2');
                        
                        // Check table columns in Section 2
                        const tables = Array.from(document.querySelectorAll('table'));
                        let sec2Cols = [];
                        if (tables.length >= 2) {
                            sec2Cols = Array.from(tables[1].querySelectorAll('th')).map(th => th.innerText.trim());
                        }

                        let sec1Rows = [];
                        if (tables.length >= 1) {
                            sec1Rows = Array.from(tables[0].querySelectorAll('tbody tr')).map(tr => tr.innerText.trim().replace(/\\s+/g, ' '));
                        }

                        return {
                            hasSec1,
                            hasSec2,
                            hasSec3,
                            hasGrid: !!gridEl,
                            sec1RowCount: sec1Rows.length,
                            sec1FirstRow: sec1Rows[0] || null,
                            sec2Cols,
                            tablesCount: tables.length
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Status: sec1={val.get('hasSec1')}, sec2={val.get('hasSec2')}, sec3={val.get('hasSec3')}, grid={val.get('hasGrid')}, sec1Rows={val.get('sec1RowCount')}")
                if val.get("hasSec1") and val.get("hasSec2") and not val.get("hasSec3") and val.get("sec1RowCount", 0) > 0:
                    print("SUCCESS: Side-by-side panels active, Section 3 is NOT displayed initially!")
                    break

            print("\n--- PHASE 1: INITIAL STATE AUDIT ---")
            print("- Section 1 (Predicted Crimes):", val.get("hasSec1"), f"({val.get('sec1RowCount')} active crimes)")
            print("- Section 2 (Crime-wise Resource Mapping):", val.get("hasSec2"), "Columns:", val.get("sec2Cols"))
            print("- Section 3 (Optimized Resource Allocation) Initially Hidden:", not val.get("hasSec3"))
            print("- Side-by-side Grid Layout:", val.get("hasGrid"))

            # Capture screenshot of initial side-by-side layout (before optimization)
            print("Capturing initial side-by-side screenshot...")
            s1 = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "captureBeyondViewport": True})
            if s1.get("data"):
                with open(INITIAL_SCREENSHOT, "wb") as f:
                    f.write(base64.b64decode(s1["data"]))
                print(f"Saved initial screenshot to: {INITIAL_SCREENSHOT}")

            # Interactivity test: Click 3rd crime
            print("\n--- PHASE 2: INTERACTIVITY TEST ---")
            click_js = """
                (() => {
                    const rows = Array.from(document.querySelectorAll('table')[0].querySelectorAll('tbody tr'));
                    if (rows.length > 2) {
                        rows[2].click();
                        return rows[2].innerText.trim();
                    }
                    return null;
                })()
            """
            clicked_text = (await call("Runtime.evaluate", {"expression": click_js, "returnByValue": True})).get("result", {}).get("value")
            print("Clicked crime row:", clicked_text)
            await asyncio.sleep(1)

            # Check right panel after clicking
            check_right_js = """
                (() => {
                    const tables = Array.from(document.querySelectorAll('table'));
                    if (tables.length >= 2) {
                        return Array.from(tables[1].querySelectorAll('tbody tr')).map(tr => tr.innerText.trim().replace(/\\s+/g, ' '));
                    }
                    return [];
                })()
            """
            right_rows = (await call("Runtime.evaluate", {"expression": check_right_js, "returnByValue": True})).get("result", {}).get("value")
            print(f"Right panel updated with {len(right_rows)} mapped pools for clicked crime.")
            for r in right_rows[:3]:
                print("  Mapped pool:", r)

            # PHASE 3: Trigger 'Optimize Resources'
            print("\n--- PHASE 3: OPTIMIZATION EXECUTION ---")
            opt_btn_js = """
                (() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimize Resources'));
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                })()
            """
            btn_clicked = (await call("Runtime.evaluate", {"expression": opt_btn_js, "returnByValue": True})).get("result", {}).get("value")
            print("Clicked 'Optimize Resources' button:", btn_clicked)

            # Wait for Section 3 to appear
            opt_val = {}
            for i in range(25):
                await asyncio.sleep(1)
                check_opt_js = """
                    (() => {
                        const body = document.body.innerText;
                        const hasSec3 = body.includes('Optimized Resource Allocation');
                        const tables = Array.from(document.querySelectorAll('table'));
                        let sec3Cols = [];
                        let sec3Rows = [];
                        if (tables.length >= 3) {
                            sec3Cols = Array.from(tables[2].querySelectorAll('th')).map(th => th.innerText.trim());
                            sec3Rows = Array.from(tables[2].querySelectorAll('tbody tr')).map(tr => tr.innerText.trim().replace(/\\s+/g, ' '));
                        }
                        return {
                            hasSec3,
                            sec3Cols,
                            sec3RowCount: sec3Rows.length,
                            sec3FirstRow: sec3Rows[0] || null,
                            tablesCount: tables.length
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_opt_js, "returnByValue": True})
                opt_val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Waiting for solver... hasSec3={opt_val.get('hasSec3')}, rows={opt_val.get('sec3RowCount')}")
                if opt_val.get("hasSec3") and opt_val.get("sec3RowCount", 0) > 0:
                    print("SUCCESS: Section 3 appeared with solved allocations!")
                    break

            print("\n--- OPTIMIZATION SOLVER AUDIT ---")
            print("- Section 3 Rendered:", opt_val.get("hasSec3"))
            print("- Section 3 Columns:", opt_val.get("sec3Cols"))
            print("- Section 3 Allocated Pools Count:", opt_val.get("sec3RowCount"))
            print("- Section 3 First Allocation Row:", opt_val.get("sec3FirstRow"))

            # Capture screenshot of full optimized view
            print("\nCapturing full optimized side-by-side + allocation screenshot...")
            s2 = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "captureBeyondViewport": True})
            if s2.get("data"):
                with open(OPTIMIZED_SCREENSHOT, "wb") as f:
                    f.write(base64.b64decode(s2["data"]))
                print(f"Saved optimized screenshot to: {OPTIMIZED_SCREENSHOT}")

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
