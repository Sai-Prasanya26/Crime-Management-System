import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_home_8_modules"

SHOT_HOME_DESKTOP = os.path.join(ARTIFACT_DIR, "home_8_modules_desktop.png")
SHOT_HOME_RESPONSIVE = os.path.join(ARTIFACT_DIR, "home_8_modules_responsive.png")

EXPECTED_MODULES = [
    {"index": 1, "title": "Crime Analytics", "expected_route": "/analytics", "img_sub": "crime-analytics"},
    {"index": 2, "title": "Geographic Intelligence", "expected_route": "/districts", "img_sub": "geographic-intelligence"},
    {"index": 3, "title": "Crime Trends", "expected_route": "/trends", "img_sub": "crime-trends"},
    {"index": 4, "title": "Crime Predictions", "expected_route": "/predictions", "img_sub": "crime-predictions"},
    {"index": 5, "title": "Crime Risk Assessment", "expected_route": "/risk", "img_sub": "risk-assessment"},
    {"index": 6, "title": "Resource Allocation", "expected_route": "/resources", "img_sub": "resource-optimization"},
    {"index": 7, "title": "Budget Analysis", "expected_route": "/budget", "img_sub": "budget-analysis"},
    {"index": 8, "title": "Reports", "expected_route": "/reports", "img_sub": "intelligence-reports"},
]

async def run_verification():
    print("=== STARTING HOME PAGE 8 MODULES VERIFICATION ===", flush=True)

    # 1. Login to get JWT for route testing
    async with httpx.AsyncClient() as client:
        login_resp = await client.post(
            "http://127.0.0.1:8000/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
            timeout=10.0
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        print("[Auth] Obtained admin access token successfully", flush=True)

    # 2. Launch headless Chrome
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9238",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[Chrome] Launched headless Chrome (PID: {chrome_proc.pid}) on port 9238", flush=True)
    await asyncio.sleep(2.5)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9238/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=30_000_000) as ws:
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

            # Set desktop metrics 1440 x 1100
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 1100,
                "deviceScaleFactor": 1,
                "mobile": False,
            })

            # Navigate to home page
            await call("Page.navigate", {"url": "http://127.0.0.1:5174/"})
            await asyncio.sleep(2)

            # Store token in localStorage
            token_js = f"""
            localStorage.setItem('cms_access_token', '{token}');
            localStorage.setItem('auth_token', '{token}');
            """
            await call("Runtime.evaluate", {"expression": token_js})

            # 3. VERIFY MODULE CARDS DATA & COUNT
            eval_modules_js = """
            (() => {
                const section = document.getElementById('modules');
                if (!section) return { error: 'Section #modules not found' };

                const cards = Array.from(section.querySelectorAll('a[href]'));
                const cardData = cards.map(c => {
                    const h3 = c.querySelector('h3');
                    const img = c.querySelector('img');
                    const desc = c.querySelector('p');
                    const action = c.querySelector('div.border-t span');
                    const rect = c.getBoundingClientRect();
                    return {
                        title: h3 ? h3.innerText.trim() : null,
                        href: c.getAttribute('href'),
                        imgSrc: img ? img.getAttribute('src') : null,
                        imgLoaded: img ? (img.complete && img.naturalWidth > 0) : false,
                        imgNaturalWidth: img ? img.naturalWidth : 0,
                        imgNaturalHeight: img ? img.naturalHeight : 0,
                        desc: desc ? desc.innerText.trim() : null,
                        actionText: action ? action.innerText.trim() : null,
                        rect: {
                            top: Math.round(rect.top),
                            left: Math.round(rect.left),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                        }
                    };
                });
                return { count: cards.length, cards: cardData };
            })()
            """
            res = await call("Runtime.evaluate", {"expression": eval_modules_js, "returnByValue": True})
            data = res["result"]["value"]
            assert "error" not in data, f"Error inspecting modules: {data.get('error')}"
            assert data["count"] == 8, f"Expected exactly 8 module cards, found {data['count']}"
            print(f"[Check 1] Successfully found exactly {data['count']} module cards", flush=True)

            cards = data["cards"]
            for i, exp in enumerate(EXPECTED_MODULES):
                actual = cards[i]
                print(f"  Card #{i+1}: '{actual['title']}' -> href='{actual['href']}' image='{actual['imgSrc']}' (Loaded: {actual['imgLoaded']}, Size: {actual['imgNaturalWidth']}x{actual['imgNaturalHeight']})", flush=True)
                assert actual["title"] == exp["title"], f"Card #{i+1} title mismatch: expected '{exp['title']}', got '{actual['title']}'"
                assert actual["href"] == exp["expected_route"], f"Card #{i+1} route mismatch: expected '{exp['expected_route']}', got '{actual['href']}'"
                assert exp["img_sub"] in actual["imgSrc"], f"Card #{i+1} image mismatch: expected '{exp['img_sub']}' in '{actual['imgSrc']}'"
                assert actual["imgLoaded"] == True, f"Card #{i+1} image failed to load (broken image): {actual['imgSrc']}"
                assert actual["imgNaturalWidth"] > 0, f"Card #{i+1} image naturalWidth is 0"

            print("[Check 2] All 8 module titles, routes, and image assets match exact specifications and loaded cleanly", flush=True)

            # 4. VERIFY DESKTOP 4x2 GRID ALIGNMENT
            # Row 1 cards (0, 1, 2, 3) must share the same top offset (+-3px)
            row1_tops = [c["rect"]["top"] for c in cards[0:4]]
            assert max(row1_tops) - min(row1_tops) <= 4, f"Row 1 cards do not align horizontally: {row1_tops}"

            # Row 2 cards (4, 5, 6, 7) must share the same top offset (+-3px)
            row2_tops = [c["rect"]["top"] for c in cards[4:8]]
            assert max(row2_tops) - min(row2_tops) <= 4, f"Row 2 cards do not align horizontally: {row2_tops}"

            # Row 2 must be strictly below Row 1
            assert min(row2_tops) > max(row1_tops) + 200, f"Row 2 is not positioned below Row 1: Row1={row1_tops}, Row2={row2_tops}"

            # Check that each row has 4 cards with strictly increasing left offsets
            row1_lefts = [c["rect"]["left"] for c in cards[0:4]]
            row2_lefts = [c["rect"]["left"] for c in cards[4:8]]
            assert row1_lefts == sorted(row1_lefts) and len(set(row1_lefts)) == 4, f"Row 1 does not have 4 distinct columns: {row1_lefts}"
            assert row2_lefts == sorted(row2_lefts) and len(set(row2_lefts)) == 4, f"Row 2 does not have 4 distinct columns: {row2_lefts}"

            # Check card dimensions are consistent
            widths = [c["rect"]["width"] for c in cards]
            heights = [c["rect"]["height"] for c in cards]
            assert max(widths) - min(widths) <= 6, f"Card widths are not uniform: {widths}"
            assert max(heights) - min(heights) <= 10, f"Card heights are not uniform: {heights}"

            print(f"[Check 3] Verified Desktop 4x2 Grid: Row1 top={row1_tops[0]}px, Row2 top={row2_tops[0]}px, card size ~{widths[0]}x{heights[0]}px", flush=True)

            # Capture desktop full grid screenshot
            # Scroll section into view
            await call("Runtime.evaluate", {"expression": "document.getElementById('modules').scrollIntoView({behavior: 'instant', block: 'start'})"})
            await asyncio.sleep(0.5)

            shot = await call("Page.captureScreenshot", {"format": "png"})
            with open(SHOT_HOME_DESKTOP, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print(f"[Screenshot] Saved desktop 4x2 grid to {SHOT_HOME_DESKTOP}", flush=True)

            # 5. VERIFY RESPONSIVE LAYOUT (768px Tablet)
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 768,
                "height": 1024,
                "deviceScaleFactor": 1,
                "mobile": False,
            })
            await asyncio.sleep(0.8)

            res_resp = await call("Runtime.evaluate", {"expression": eval_modules_js, "returnByValue": True})
            resp_data = res_resp["result"]["value"]
            assert resp_data["count"] == 8, f"Expected 8 cards on responsive, got {resp_data['count']}"
            resp_cards = resp_data["cards"]

            # On 768px (sm:grid-cols-2), cards should form 4 rows of 2 cards
            # Check cards 0 and 1 share same top, cards 2 and 3 share same top, etc.
            top0 = resp_cards[0]["rect"]["top"]
            top1 = resp_cards[1]["rect"]["top"]
            assert abs(top0 - top1) <= 5, f"Tablet cards 0 and 1 not in same row: {top0} vs {top1}"

            await call("Runtime.evaluate", {"expression": "document.getElementById('modules').scrollIntoView({behavior: 'instant', block: 'start'})"})
            await asyncio.sleep(0.5)

            shot_resp = await call("Page.captureScreenshot", {"format": "png"})
            with open(SHOT_HOME_RESPONSIVE, "wb") as f:
                f.write(base64.b64decode(shot_resp["data"]))
            print(f"[Screenshot] Saved responsive tablet grid to {SHOT_HOME_RESPONSIVE}", flush=True)

            # 6. VERIFY ALL 8 NAVIGATION ROUTES BY CLICKING
            # Reset to desktop
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 1100,
                "deviceScaleFactor": 1,
                "mobile": False,
            })

            for i, exp in enumerate(EXPECTED_MODULES):
                # Return to home
                await call("Page.navigate", {"url": "http://127.0.0.1:5174/"})
                await asyncio.sleep(1.2)

                # Click module card
                click_js = f"""
                (() => {{
                    const cards = Array.from(document.querySelectorAll('#modules a[href]'));
                    if (cards[{i}]) {{
                        cards[{i}].click();
                        return true;
                    }}
                    return false;
                }})()
                """
                clicked = (await call("Runtime.evaluate", {"expression": click_js}))["result"]["value"]
                assert clicked, f"Failed to click card #{i+1} ({exp['title']})"
                await asyncio.sleep(1.2)

                # Check window.location.pathname
                path_res = await call("Runtime.evaluate", {"expression": "window.location.pathname"})
                current_path = path_res["result"]["value"]
                print(f"  Navigation test #{i+1}: '{exp['title']}' clicked -> navigated to '{current_path}' (expected '{exp['expected_route']}')", flush=True)
                assert current_path == exp["expected_route"], f"Navigation failed for {exp['title']}: expected {exp['expected_route']}, got {current_path}"

            print("[Check 4] ALL 8 MODULE NAVIGATION CLICKS SUCCEEDED TO RESPECTIVE INTERNAL ROUTES!", flush=True)
            print("=== VERIFICATION COMPLETED SUCCESSFULLY ===", flush=True)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(run_verification())
