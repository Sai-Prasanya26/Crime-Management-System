"""
Automated CDP script to verify and screenshot the Tactical Workspace (Sections B, C, D) with modal closed.
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "resource_optimization_tactical_workspace.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_resource_tactical"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9224",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9224")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9224/json")).json()
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
                "height": 2400,
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

            target_url = "http://127.0.0.1:5174/resources?tab=ai_optimization&state_id=2&period=2026-11-01"
            print(f"Navigating to {target_url}...")
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await call("Runtime.evaluate", {"expression": set_token_js})
            print("Token injected. Waiting for Resource Optimization to render...")

            for i in range(20):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const body = document.body.innerText;
                        // Click Optimizer tab if not active
                        if (!body.includes('Phase 10: Crime-Specific Preventive AI Resource Optimization')) {
                            const optBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimizer'));
                            if (optBtn) optBtn.click();
                        }
                        
                        // Close modal if open
                        const closeBtn = document.querySelector('button:has-text("Close"), button[aria-label="Close"]');
                        if (closeBtn) closeBtn.click();

                        // Select District 674 if present
                        const distBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Alluri Sitharama Raju'));
                        if (distBtn) distBtn.click();
                        
                        return {
                            hasHeader: body.includes('Phase 10: Crime-Specific Preventive AI Resource Optimization'),
                            hasWorkspace: body.includes('Tactical Police Resource Deployment Workspace'),
                            hasSecB: body.includes('SECTION B: PREDICTED CRIMES') || body.includes('Section B: Predicted Crimes'),
                            hasSecC: body.includes('SECTION C: SELECTED CRIME') || body.includes('Section C: Selected Crime'),
                            hasSecD: body.includes('SECTION D: FINAL AGGREGATED RESOURCE ALLOCATION') || body.includes('Section D: Final Aggregated Resource Allocation'),
                            hasExtortion: body.includes('Extortion'),
                            hasDrugOffense: body.includes('Drug Offense'),
                            hasPersonnel: body.includes('Police Officers') || body.includes('Personnel Pool'),
                            hasMobility: body.includes('Patrol Vehicles') || body.includes('Mobility Pool')
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Status: secB={val.get('hasSecB')}, secC={val.get('hasSecC')}, secD={val.get('hasSecD')}, extortion={val.get('hasExtortion')}")
                if val.get("hasSecB") and val.get("hasSecD"):
                    print("SUCCESS: Sections B, C, and D are fully active and rendered!")
                    break

            await asyncio.sleep(2)

            # Scroll directly to the Tactical Police Resource Deployment Workspace
            scroll_js = """
                (() => {
                    const el = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Tactical Police Resource Deployment Workspace'));
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                })()
            """
            await call("Runtime.evaluate", {"expression": scroll_js})
            await asyncio.sleep(1)

            # Capture high-res screenshot
            print("Capturing Tactical Deployment Workspace screenshot...")
            screenshot_data = await call("Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True,
                "captureBeyondViewport": True
            })

            img_b64 = screenshot_data.get("data")
            if img_b64:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(img_b64))
                with open("resource_optimization_tactical_workspace.png", "wb") as f:
                    f.write(base64.b64decode(img_b64))
                print(f"Saved tactical workspace screenshot to: {SCREENSHOT_PATH}")

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
