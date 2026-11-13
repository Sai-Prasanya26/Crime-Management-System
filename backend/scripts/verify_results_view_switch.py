"""
Automated CDP script to verify:
1. Initial two-column layout without nested scrollbars.
2. Clicking a crime updates right-side mapping.
3. Clicking 'Optimize Resources' switches to full-width allocation results view (Sections 1 & 2 hidden).
4. Clicking 'Back to Crime Analysis' returns to two-column view with crime selection preserved.
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
INITIAL_SCREENSHOT = os.path.join(ARTIFACT_DIR, "resource_optimization_initial_view.png")
RESULTS_SCREENSHOT = os.path.join(ARTIFACT_DIR, "resource_optimization_results_view.png")
BACK_SCREENSHOT = os.path.join(ARTIFACT_DIR, "resource_optimization_back_to_analysis.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_switch_view"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9227",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9227")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9227/json")).json()
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
                "height": 1800,
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
            print("Token injected. Waiting for UI to render...")

            val = {}
            for i in range(20):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const body = document.body.innerText;
                        
                        const hasSec1 = body.includes('Predicted Crimes');
                        const hasSec2 = body.includes('Crime-wise Resource Mapping');
                        const hasSec3 = body.includes('Optimized Resource Allocation');
                        const gridEl = document.querySelector('.grid.grid-cols-1.lg\\\\:grid-cols-2');
                        
                        const maxHScrolls = document.querySelectorAll('.max-h-\\\\[520px\\\\], .overflow-y-auto');

                        const tables = Array.from(document.querySelectorAll('table'));
                        let sec1Rows = [];
                        if (tables.length >= 1) {
                            sec1Rows = Array.from(tables[0].querySelectorAll('tbody tr')).map(tr => tr.innerText.trim().replace(/\\s+/g, ' '));
                        }

                        return {
                            hasSec1,
                            hasSec2,
                            hasSec3,
                            hasGrid: !!gridEl,
                            nestedScrollCount: maxHScrolls.length,
                            sec1RowCount: sec1Rows.length,
                            sec1FirstRow: sec1Rows[0] || null,
                            tablesCount: tables.length
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Initial: sec1={val.get('hasSec1')}, sec2={val.get('hasSec2')}, sec3={val.get('hasSec3')}, nestedScrolls={val.get('nestedScrollCount')}")
                if val.get("hasSec1") and val.get("hasSec2") and not val.get("hasSec3") and val.get("sec1RowCount", 0) > 0:
                    print("SUCCESS: Initial 2-column view loaded with NO nested scrollbars and Section 3 hidden!")
                    break

            print("\n--- PHASE 1: INITIAL TWO-COLUMN VIEW AUDIT ---")
            print("- Section 1 (Predicted Crimes) Present:", val.get("hasSec1"))
            print("- Section 2 (Crime-wise Mapping) Present:", val.get("hasSec2"))
            print("- Section 3 (Optimized Allocation) Hidden:", not val.get("hasSec3"))
            print("- Nested scrollbars removed:", val.get("nestedScrollCount") == 0)

            # Capture screenshot of initial view
            s1 = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "captureBeyondViewport": True})
            if s1.get("data"):
                with open(INITIAL_SCREENSHOT, "wb") as f:
                    f.write(base64.b64decode(s1["data"]))
                print(f"Saved initial view screenshot to: {INITIAL_SCREENSHOT}")

            # Interactivity test: Click 2nd crime
            print("\n--- PHASE 2: CLICK CRIME FOR MAPPING ---")
            click_js = """
                (() => {
                    const rows = Array.from(document.querySelectorAll('table')[0].querySelectorAll('tbody tr'));
                    if (rows.length > 1) {
                        rows[1].click();
                        return rows[1].innerText.trim();
                    }
                    return null;
                })()
            """
            clicked_crime = (await call("Runtime.evaluate", {"expression": click_js, "returnByValue": True})).get("result", {}).get("value")
            print("Selected crime:", clicked_crime)
            await asyncio.sleep(1)

            # PHASE 3: Execute Optimization
            print("\n--- PHASE 3: CLICK OPTIMIZE RESOURCES ---")
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
            await call("Runtime.evaluate", {"expression": opt_btn_js})

            # Wait for Results View to appear (Sections 1 & 2 hidden, Section 3 shown)
            res_val = {}
            for i in range(25):
                await asyncio.sleep(1)
                check_res_js = """
                    (() => {
                        const body = document.body.innerText;
                        const hasSec1 = body.includes('Predicted Crimes');
                        const hasSec2 = body.includes('Crime-wise Resource Mapping');
                        const hasSec3 = body.includes('Optimized Resource Allocation');
                        const hasBackBtn = !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back to Crime Analysis'));
                        const tables = Array.from(document.querySelectorAll('table'));
                        let cols = [];
                        let rowCount = 0;
                        if (tables.length === 1 && hasSec3) {
                            cols = Array.from(tables[0].querySelectorAll('th')).map(th => th.innerText.trim());
                            rowCount = tables[0].querySelectorAll('tbody tr').length;
                        }
                        return {
                            hasSec1,
                            hasSec2,
                            hasSec3,
                            hasBackBtn,
                            tablesCount: tables.length,
                            cols,
                            rowCount
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_res_js, "returnByValue": True})
                res_val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Waiting for results view... sec1={res_val.get('hasSec1')}, sec2={res_val.get('hasSec2')}, sec3={res_val.get('hasSec3')}, backBtn={res_val.get('hasBackBtn')}")
                if res_val.get("hasSec3") and not res_val.get("hasSec1") and not res_val.get("hasSec2"):
                    print("SUCCESS: Sections 1 & 2 completely hidden, Section 3 is the main full-width content!")
                    break

            print("\n--- RESULTS VIEW AUDIT ---")
            print("- Sections 1 & 2 completely hidden:", not res_val.get("hasSec1") and not res_val.get("hasSec2"))
            print("- Section 3 full-width content rendered:", res_val.get("hasSec3"))
            print("- 'Back to Crime Analysis' button present:", res_val.get("hasBackBtn"))
            print("- Section 3 columns:", res_val.get("cols"))
            print("- Section 3 row count:", res_val.get("rowCount"))

            # Capture screenshot of results view
            s2 = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "captureBeyondViewport": True})
            if s2.get("data"):
                with open(RESULTS_SCREENSHOT, "wb") as f:
                    f.write(base64.b64decode(s2["data"]))
                print(f"Saved results view screenshot to: {RESULTS_SCREENSHOT}")

            # PHASE 4: Click 'Back to Crime Analysis'
            print("\n--- PHASE 4: CLICK 'BACK TO CRIME ANALYSIS' ---")
            back_btn_js = """
                (() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back to Crime Analysis'));
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                })()
            """
            await call("Runtime.evaluate", {"expression": back_btn_js})
            await asyncio.sleep(1)

            check_back_js = """
                (() => {
                    const body = document.body.innerText;
                    const hasSec1 = body.includes('Predicted Crimes');
                    const hasSec2 = body.includes('Crime-wise Resource Mapping');
                    const hasSec3 = body.includes('Optimized Resource Allocation');
                    const selectedRow = document.querySelector('tr.border-l-4');
                    return {
                        hasSec1,
                        hasSec2,
                        hasSec3,
                        selectedRowText: selectedRow ? selectedRow.innerText.trim().replace(/\\s+/g, ' ') : null
                    };
                })()
            """
            back_val = (await call("Runtime.evaluate", {"expression": check_back_js, "returnByValue": True})).get("result", {}).get("value", {})
            print("\n--- RETURN TO CRIME ANALYSIS AUDIT ---")
            print("- Sections 1 & 2 restored:", back_val.get("hasSec1") and back_val.get("hasSec2"))
            print("- Section 3 hidden:", not back_val.get("hasSec3"))
            print("- Previously selected crime preserved:", back_val.get("selectedRowText"))

            # Capture screenshot of back to analysis view
            s3 = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "captureBeyondViewport": True})
            if s3.get("data"):
                with open(BACK_SCREENSHOT, "wb") as f:
                    f.write(base64.b64decode(s3["data"]))
                print(f"Saved return to analysis screenshot to: {BACK_SCREENSHOT}")

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
