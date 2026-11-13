"""
Automated CDP script to verify and screenshot the restored Resource Optimization module.
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "resource_optimization_restored_verification.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_resource_opt"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9223",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9223")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9223/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=20_000_000) as ws:
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
                "height": 2800,
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

            target_url = "http://127.0.0.1:5174/resources?tab=ai_optimization&state_id=2&district_id=674&period=2026-11-01"
            print(f"Navigating to {target_url}...")
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await call("Runtime.evaluate", {"expression": set_token_js})
            print("Token injected and page reloaded. Waiting for Resource Optimization to render...")

            # Wait and inspect page content
            for i in range(20):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const body = document.body.innerText;
                        // Click Optimizer tab if not active
                        if (!body.includes('Phase 10: Crime-Specific Preventive AI Resource Optimization')) {
                            const optBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimizer'));
                            if (optBtn) {
                                optBtn.click();
                            }
                        }
                        
                        return {
                            hasHeader: body.includes('Phase 10: Crime-Specific Preventive AI Resource Optimization'),
                            hasWorkspace: body.includes('Tactical Police Resource Deployment Workspace'),
                            hasSectionB: body.includes('Section B: Predicted Crimes'),
                            hasSectionC: body.includes('Section C: Selected Crime'),
                            hasSectionD: body.includes('Section D: Final Aggregated Resource Allocation'),
                            hasCapacityOverridesButton: body.includes('Capacity Overrides'),
                            hasApplySimulation: body.includes('Apply Simulation'),
                            sampleText: body.slice(0, 200).replace(/\\n/g, ' ')
                        };
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                val = res.get("result", {}).get("value", {})
                print(f"[{i+1}s] Check: hasHeader={val.get('hasHeader')}, hasWorkspace={val.get('hasWorkspace')}, hasSecB={val.get('hasSectionB')}, hasSecC={val.get('hasSectionC')}, hasSecD={val.get('hasSectionD')}")
                if val.get("hasSectionB") and val.get("hasSectionD"):
                    print("SUCCESS: All required sections rendered!")
                    break

            # Capture detailed inspection info
            inspect_js = """
                (() => {
                    const bodyText = document.body.innerText;
                    return {
                        title: document.title,
                        headings: Array.from(document.querySelectorAll('h2, h3, h4, h5')).map(h => h.innerText.trim()).filter(Boolean),
                        tablesCount: document.querySelectorAll('table').length,
                        hasSectionB: bodyText.includes('Section B: Predicted Crimes'),
                        hasSectionC: bodyText.includes('Section C: Selected Crime'),
                        hasSectionD: bodyText.includes('Section D: Final Aggregated Resource Allocation'),
                        hasOverridesButton: bodyText.includes('Capacity Overrides'),
                        hasApplySimulation: bodyText.includes('Apply Simulation'),
                        hasResetToBaseline: bodyText.includes('Reset to Baseline')
                    };
                })()
            """
            inspect_res = await call("Runtime.evaluate", {"expression": inspect_js, "returnByValue": True})
            print("\n=== DOM INSPECTION RESULT ===")
            print(json.dumps(inspect_res.get("result", {}).get("value", {}), indent=2))

            # Capture high-res screenshot
            print("\nCapturing verification screenshot...")
            screenshot_data = await call("Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True,
                "captureBeyondViewport": True
            })

            img_b64 = screenshot_data.get("data")
            if img_b64:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(img_b64))
                with open("resource_optimization_verification.png", "wb") as f:
                    f.write(base64.b64decode(img_b64))
                print(f"Saved screenshot to: {SCREENSHOT_PATH}")

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
