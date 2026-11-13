"""
Automated CDP script to capture screenshot of the clean vertical Operations Dashboard.
"""
import asyncio
import json
import base64
import subprocess
import time
import httpx
import websockets
import os

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "operational_control_centre_dashboard.png")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_vertical"

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ")")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9222/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
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

            # Set viewport wide and tall for continuous vertical display
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1400,
                "height": 3400,
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

            print("Navigating to http://127.0.0.1:5174/dashboard...")
            await call("Page.navigate", {"url": "http://127.0.0.1:5174/dashboard"})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '/dashboard';
            """
            await call("Runtime.evaluate", {"expression": set_token_js})
            print("Token injected. Waiting for vertical operations dashboard to finish loading...")

            # Poll for loading state to finish
            for i in range(30):
                await asyncio.sleep(1)
                check_js = """
                    (() => {
                        const sec = document.getElementById('operations-overview-section');
                        if (!sec) return 'NO_SECTION';
                        if (sec.innerText.includes('Loading operations data')) return 'LOADING';
                        if (sec.innerText.includes('Crime Predictions') && sec.innerText.includes('Resource Allocation')) return 'READY';
                        return 'WAITING';
                    })()
                """
                res = await call("Runtime.evaluate", {"expression": check_js, "returnByValue": True})
                status = res.get("result", {}).get("value")
                print(f"[{i+1}s] Operations Section Status: {status}")
                if status == "READY":
                    break

            # Scroll into view
            scroll_js = """
                const el = document.getElementById('operations-overview-section');
                if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
            """
            await call("Runtime.evaluate", {"expression": scroll_js})
            await asyncio.sleep(2)

            # Capture high-res screenshot
            print("Capturing final vertical layout screenshot...")
            screenshot_data = await call("Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True,
                "captureBeyondViewport": True
            })

            img_b64 = screenshot_data.get("data")
            if img_b64:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(img_b64))
                with open("operational_control_centre_dashboard.png", "wb") as f:
                    f.write(base64.b64decode(img_b64))
                print(f"Final continuous vertical screenshot saved to: {SCREENSHOT_PATH}")

    finally:
        chrome_proc.terminate()
        print("Terminated Chrome process.")

if __name__ == "__main__":
    asyncio.run(run_cdp())
