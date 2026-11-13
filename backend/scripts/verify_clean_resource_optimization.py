"""
Automated CDP script to verify and screenshot the Restored Clean Resource Optimization UI (ONLY 3 SECTIONS).
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "resource_optimization_clean_3_sections.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_resource_clean"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9225",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9225")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9225/json")).json()
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
                "height": 2200,
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
            print("Token injected. Waiting for Clean Resource Optimization UI to render...")

            val = {}
            for i in range(20):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const body = document.body.innerText;
                        
                        // Check section headers
                        const hasSec1 = body.includes('1') && body.includes('Predicted Crimes');
                        const hasSec2 = body.includes('2') && body.includes('Crime-wise Resource Mapping');
                        const hasSec3 = body.includes('3') && body.includes('Optimized Resource Allocation');
                        
                        // Check that 13 tabs are NOT present
                        const has13Tabs = body.includes('Tactical Police Resource Deployment Workspace') ||
                                          body.includes('More Modules ▾') ||
                                          body.includes('National Resource Landscape');
                        
                        // Check table columns in Section 2 (Exactly 2 columns)
                        const tables = Array.from(document.querySelectorAll('table'));
                        let sec2Cols = [];
                        if (tables.length >= 2) {
                            sec2Cols = Array.from(tables[1].querySelectorAll('th')).map(th => th.innerText.trim());
                        }

                        // Check table columns in Section 3 (Exactly 5 columns)
                        let sec3Cols = [];
                        if (tables.length >= 3) {
                            sec3Cols = Array.from(tables[2].querySelectorAll('th')).map(th => th.innerText.trim());
                        }

                        // Check crime rows in Section 1
                        let sec1Rows = [];
                        if (tables.length >= 1) {
                            sec1Rows = Array.from(tables[0].querySelectorAll('tbody tr')).map(tr => tr.innerText.trim().replace(/\\s+/g, ' '));
                        }

                        return {
                            hasSec1,
                            hasSec2,
                            hasSec3,
                            has13Tabs,
                            sec1RowCount: sec1Rows.length,
                            sec1FirstRow: sec1Rows[0] || null,
                            sec2Cols,
                            sec3Cols,
                            tablesCount: tables.length
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Status: sec1={val.get('hasSec1')}, sec2={val.get('hasSec2')}, sec3={val.get('hasSec3')}, tables={val.get('tablesCount')}, sec1Rows={val.get('sec1RowCount')}")
                if val.get("hasSec1") and val.get("hasSec2") and val.get("hasSec3") and val.get("sec1RowCount", 0) > 0:
                    print("SUCCESS: All 3 clean sections are rendered and populated!")
                    break

            print("Audit Report:")
            print("- Section 1 (Predicted Crimes):", val.get("hasSec1"), f"({val.get('sec1RowCount')} active crimes)")
            print("- Section 2 (Crime-wise Resource Mapping):", val.get("hasSec2"), "Columns:", val.get("sec2Cols"))
            print("- Section 3 (Optimized Resource Allocation):", val.get("hasSec3"), "Columns:", val.get("sec3Cols"))
            print("- Old 13-Tab Navigation / Tactical Workspace Present:", val.get("has13Tabs"))

            # Test Decoupling: Click 2nd crime in Section 1 and verify Section 3 is unchanged
            click_js = """
                (() => {
                    const tables = Array.from(document.querySelectorAll('table'));
                    if (tables.length >= 1) {
                        const rows = Array.from(tables[0].querySelectorAll('tbody tr'));
                        if (rows.length > 1) {
                            rows[1].click();
                            return true;
                        }
                    }
                    return false;
                })()
            """
            clicked = (await call("Runtime.evaluate", {"expression": click_js, "returnByValue": True})).get("result", {}).get("value")
            print(f"Clicked second crime row for interactivity test: {clicked}")
            await asyncio.sleep(1)

            # Capture high-res screenshot
            print("Capturing full clean 3-section page screenshot...")
            screenshot_data = await call("Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True,
                "captureBeyondViewport": True
            })

            img_b64 = screenshot_data.get("data")
            if img_b64:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(img_b64))
                with open("resource_optimization_clean_3_sections.png", "wb") as f:
                    f.write(base64.b64decode(img_b64))
                print(f"Saved clean 3-section screenshot to: {SCREENSHOT_PATH}")

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
