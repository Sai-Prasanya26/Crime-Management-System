import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_home_reorder_resource_typography"

SHOT_HOME_FINAL = os.path.join(ARTIFACT_DIR, "home_8_modules_final_order.png")
SHOT_RESOURCE_NO_DUP = os.path.join(ARTIFACT_DIR, "resource_optimization_no_duplicate_heading.png")
SHOT_RESOURCE_RESULTS_TYPO = os.path.join(ARTIFACT_DIR, "resource_optimization_results_typography_matched.png")

EXPECTED_NEW_ORDER = [
    # Row 1
    {"index": 1, "title": "Crime Analytics", "expected_route": "/analytics", "img_sub": "crime-analytics"},
    {"index": 2, "title": "Geographic Intelligence", "expected_route": "/districts", "img_sub": "geographic-intelligence"},
    {"index": 3, "title": "Crime Trends", "expected_route": "/trends", "img_sub": "crime-trends"},
    {"index": 4, "title": "Crime Risk Assessment", "expected_route": "/risk", "img_sub": "risk-assessment"},
    # Row 2
    {"index": 5, "title": "Crime Predictions", "expected_route": "/predictions", "img_sub": "crime-predictions"},
    {"index": 6, "title": "Resource Allocation", "expected_route": "/resources", "img_sub": "resource-optimization"},
    {"index": 7, "title": "Budget Analysis", "expected_route": "/budget", "img_sub": "budget-analysis"},
    {"index": 8, "title": "Reports", "expected_route": "/reports", "img_sub": "intelligence-reports"},
]

async def run_verification():
    print("=== STARTING HOME MODULE ORDER & RESOURCE OPTIMIZATION TYPOGRAPHY VERIFICATION ===", flush=True)

    # 1. Login to get JWT
    async with httpx.AsyncClient(timeout=30.0) as client:
        login_resp = await client.post(
            "http://127.0.0.1:8000/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
            timeout=30.0
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        print("[Auth] Obtained admin access token", flush=True)

    # 2. Launch headless Chrome
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9241",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[Chrome] Launched headless Chrome (PID: {chrome_proc.pid}) on port 9241", flush=True)
    await asyncio.sleep(2.5)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9241/json")).json()
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

            # -------------------------------------------------------------
            # PART 1: HOME PAGE REORDERED 8 MODULES VERIFICATION
            # -------------------------------------------------------------
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 1100,
                "deviceScaleFactor": 1,
                "mobile": False,
            })

            await call("Page.navigate", {"url": "http://127.0.0.1:5174/"})
            await asyncio.sleep(2)

            token_js = f"""
            localStorage.setItem('cms_access_token', '{token}');
            localStorage.setItem('auth_token', '{token}');
            """
            await call("Runtime.evaluate", {"expression": token_js})

            eval_home_js = """
            (() => {
                const section = document.getElementById('modules');
                if (!section) return { error: 'Section #modules not found' };

                const cards = Array.from(section.querySelectorAll('a[href]'));
                const cardData = cards.map(c => {
                    const h3 = c.querySelector('h3');
                    const img = c.querySelector('img');
                    const rect = c.getBoundingClientRect();
                    return {
                        title: h3 ? h3.innerText.trim() : null,
                        href: c.getAttribute('href'),
                        imgSrc: img ? img.getAttribute('src') : null,
                        imgLoaded: img ? (img.complete && img.naturalWidth > 0) : false,
                        rect: {
                            top: Math.round(rect.top),
                            left: Math.round(rect.left),
                        }
                    };
                });
                return { count: cards.length, cards: cardData };
            })()
            """
            res_home = (await call("Runtime.evaluate", {"expression": eval_home_js, "returnByValue": True}))["result"]["value"]
            assert res_home["count"] == 8, f"Expected 8 cards, found {res_home['count']}"

            cards = res_home["cards"]
            for i, exp in enumerate(EXPECTED_NEW_ORDER):
                actual = cards[i]
                print(f"  [Home Card #{i+1}] '{actual['title']}' -> href='{actual['href']}'", flush=True)
                assert actual["title"] == exp["title"], f"Card #{i+1} title mismatch: expected '{exp['title']}', got '{actual['title']}'"
                assert actual["href"] == exp["expected_route"], f"Card #{i+1} route mismatch: expected '{exp['expected_route']}', got '{actual['href']}'"
                assert exp["img_sub"] in actual["imgSrc"], f"Card #{i+1} image mismatch: expected '{exp['img_sub']}' in '{actual['imgSrc']}'"
                assert actual["imgLoaded"] == True, f"Card #{i+1} image failed to load"

            # Check Desktop 4x2 grid geometry
            row1_tops = [c["rect"]["top"] for c in cards[0:4]]
            row2_tops = [c["rect"]["top"] for c in cards[4:8]]
            assert max(row1_tops) - min(row1_tops) <= 4, f"Row 1 cards not aligned: {row1_tops}"
            assert max(row2_tops) - min(row2_tops) <= 4, f"Row 2 cards not aligned: {row2_tops}"
            assert min(row2_tops) > max(row1_tops) + 180, "Row 2 not below Row 1"
            print("[Check 1] Home Page 8 module cards in exact requested new order and 4x2 desktop grid verified!", flush=True)

            # Screenshot Home reordered
            await call("Runtime.evaluate", {"expression": "document.getElementById('modules').scrollIntoView({behavior: 'instant', block: 'start'})"})
            await asyncio.sleep(0.5)
            shot_home = await call("Page.captureScreenshot", {"format": "png"})
            with open(SHOT_HOME_FINAL, "wb") as f:
                f.write(base64.b64decode(shot_home["data"]))
            print(f"[Screenshot] Saved final home grid to {SHOT_HOME_FINAL}", flush=True)

            # -------------------------------------------------------------
            # PART 2: RESOURCE OPTIMIZATION TYPOGRAPHY & BUTTON VERIFICATION
            # -------------------------------------------------------------
            await call("Page.navigate", {"url": "http://127.0.0.1:5174/resources"})
            await asyncio.sleep(3)

            # Wait for demand data to load
            for _ in range(20):
                check_ready = await call("Runtime.evaluate", {
                    "expression": "document.querySelectorAll('tbody tr').length > 0",
                    "returnByValue": True
                })
                if check_ready["result"]["value"]:
                    break
                await asyncio.sleep(0.5)

            eval_res_opt_js = """
            (() => {
                const allH1s = Array.from(document.querySelectorAll('h1')).map(h => ({
                    text: h.innerText.trim(),
                    isHeader: !!h.closest('header'),
                    fontSize: window.getComputedStyle(h).fontSize,
                    fontWeight: window.getComputedStyle(h).fontWeight,
                    color: window.getComputedStyle(h).color
                }));
                const headerH1 = document.querySelector('header h1');
                const btnEl = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimize Resources'));
                const labels = Array.from(document.querySelectorAll('label')).map(l => ({
                    text: l.innerText.trim(),
                    fontSize: window.getComputedStyle(l).fontSize,
                    fontWeight: window.getComputedStyle(l).fontWeight,
                    color: window.getComputedStyle(l).color,
                    textTransform: window.getComputedStyle(l).textTransform
                }));
                const sectionHeadings = Array.from(document.querySelectorAll('h2')).map(h => ({
                    text: h.innerText.trim(),
                    fontSize: window.getComputedStyle(h).fontSize,
                    fontWeight: window.getComputedStyle(h).fontWeight,
                    color: window.getComputedStyle(h).color
                }));
                const theadCols = Array.from(document.querySelectorAll('thead th')).map(th => ({
                    text: th.innerText.trim(),
                    fontSize: window.getComputedStyle(th).fontSize,
                    fontWeight: window.getComputedStyle(th).fontWeight,
                    color: window.getComputedStyle(th).color
                }));

                const btnStyle = btnEl ? window.getComputedStyle(btnEl) : null;
                const playIcon = btnEl ? btnEl.querySelector('svg') : null;

                return {
                    allH1s,
                    headerTitle: headerH1 ? headerH1.innerText.trim() : null,
                    button: {
                        found: !!btnEl,
                        text: btnEl ? btnEl.innerText.trim() : null,
                        bgColor: btnStyle ? btnStyle.backgroundColor : null,
                        textColor: btnStyle ? btnStyle.color : null,
                        hasPlayIcon: !!playIcon,
                        fontSize: btnStyle ? btnStyle.fontSize : null,
                        fontWeight: btnStyle ? btnStyle.fontWeight : null,
                    },
                    labels,
                    sectionHeadings,
                    theadCols: theadCols.slice(0, 4),
                    leftTableRowsCount: document.querySelectorAll('tbody tr').length
                };
            })()
            """
            typo_res = (await call("Runtime.evaluate", {"expression": eval_res_opt_js, "returnByValue": True}))["result"]["value"]
            print("[Check 2] Resource Optimization Page Typography Inspection:", flush=True)
            print(f"  All H1 elements: {typo_res['allH1s']}", flush=True)
            print(f"  Sticky Header Title: '{typo_res['headerTitle']}'", flush=True)
            print(f"  Optimize Button: '{typo_res['button']['text']}' | bg={typo_res['button']['bgColor']}, text={typo_res['button']['textColor']}, icon={typo_res['button']['hasPlayIcon']}", flush=True)
            print(f"  Labels: count={len(typo_res['labels'])}, sample={typo_res['labels'][0]}", flush=True)
            print(f"  Headings: {typo_res['sectionHeadings']}", flush=True)
            print(f"  Table Thead: {typo_res['theadCols']}", flush=True)

            # Assertions
            # Exactly 1 H1 element must exist (the sticky header title)
            assert len(typo_res["allH1s"]) == 1, f"Expected exactly 1 H1 (sticky header title), found {len(typo_res['allH1s'])}: {typo_res['allH1s']}"
            assert typo_res["allH1s"][0]["isHeader"] == True, "The single H1 is not in the sticky header"
            assert typo_res["headerTitle"] == "Resource Optimization", f"Unexpected header title: {typo_res['headerTitle']}"

            # Button must be blue #1769AA (rgb(23, 105, 170)), text white (rgb(255, 255, 255))
            assert typo_res["button"]["found"] == True, "Optimize Resources button not found"
            assert "23, 105, 170" in typo_res["button"]["bgColor"], f"Button is not #1769AA blue: {typo_res['button']['bgColor']}"
            assert "255, 255, 255" in typo_res["button"]["textColor"], f"Button text is not white: {typo_res['button']['textColor']}"
            assert typo_res["button"]["hasPlayIcon"] == True, "Button does not have play icon"

            # Capture screenshot of initial Resource Optimization page without duplicate heading
            shot_opt = await call("Page.captureScreenshot", {"format": "png"})
            with open(SHOT_RESOURCE_NO_DUP, "wb") as f:
                f.write(base64.b64decode(shot_opt["data"]))
            print(f"[Screenshot] Saved resource optimization without duplicate heading to {SHOT_RESOURCE_NO_DUP}", flush=True)

            # -------------------------------------------------------------
            # PART 3: CLICK "OPTIMIZE RESOURCES" & VERIFY RESULTS TYPOGRAPHY
            # -------------------------------------------------------------
            click_opt_js = """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimize Resources'));
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            })()
            """
            opt_clicked = (await call("Runtime.evaluate", {"expression": click_opt_js}))["result"]["value"]
            assert opt_clicked, "Failed to click Optimize Resources button"
            print("  Clicked 'Optimize Resources' button. Waiting for MILP allocation results...", flush=True)

            # Wait for results view
            for _ in range(25):
                await asyncio.sleep(0.5)
                has_results = await call("Runtime.evaluate", {
                    "expression": "document.body.innerText.includes('Optimized Resource Allocation') && document.querySelectorAll('tbody tr').length > 5",
                    "returnByValue": True
                })
                if has_results["result"]["value"]:
                    break

            eval_results_js = """
            (() => {
                const h2 = document.querySelector('h2');
                const theadThs = Array.from(document.querySelectorAll('thead th')).map(th => ({
                    text: th.innerText.trim(),
                    fontSize: window.getComputedStyle(th).fontSize,
                    fontWeight: window.getComputedStyle(th).fontWeight,
                    color: window.getComputedStyle(th).color
                }));
                const tbodyRows = Array.from(document.querySelectorAll('tbody tr')).slice(0, 3).map(tr => {
                    const tds = Array.from(tr.querySelectorAll('td')).map(td => ({
                        text: td.innerText.trim(),
                        fontSize: window.getComputedStyle(td).fontSize,
                        fontWeight: window.getComputedStyle(td).fontWeight,
                        color: window.getComputedStyle(td).color
                    }));
                    return tds;
                });
                return {
                    resultsTitle: h2 ? h2.innerText.trim() : null,
                    resultsHeadingStyle: h2 ? {
                        fontSize: window.getComputedStyle(h2).fontSize,
                        fontWeight: window.getComputedStyle(h2).fontWeight
                    } : null,
                    theadThs,
                    tbodyRows
                };
            })()
            """
            results_eval = (await call("Runtime.evaluate", {"expression": eval_results_js, "returnByValue": True}))["result"]["value"]
            print("[Check 3] Optimized Resource Allocation Results View Typography:", flush=True)
            print(f"  Results Heading: '{results_eval['resultsTitle']}' | {results_eval['resultsHeadingStyle']}", flush=True)
            print(f"  Results Thead columns: {results_eval['theadThs']}", flush=True)

            assert "Optimized Resource Allocation" in results_eval["resultsTitle"]
            assert int(results_eval["resultsHeadingStyle"]["fontWeight"]) <= 700

            # Capture screenshot of results view
            shot_results = await call("Page.captureScreenshot", {"format": "png"})
            with open(SHOT_RESOURCE_RESULTS_TYPO, "wb") as f:
                f.write(base64.b64decode(shot_results["data"]))
            print(f"[Screenshot] Saved optimized resource allocation results typography to {SHOT_RESOURCE_RESULTS_TYPO}", flush=True)

            # -------------------------------------------------------------
            # PART 4: VERIFY NAVIGATION CLICKS FOR ALL 8 REORDERED CARDS
            # -------------------------------------------------------------
            for i, exp in enumerate(EXPECTED_NEW_ORDER):
                await call("Page.navigate", {"url": "http://127.0.0.1:5174/"})
                await asyncio.sleep(1.0)

                clicked = False
                for _ in range(25):
                    click_card_js = f"""
                    (() => {{
                        const card = Array.from(document.querySelectorAll('#modules a[href]')).find(c => {{
                            const h3 = c.querySelector('h3');
                            return h3 && h3.innerText.trim() === '{exp["title"]}';
                        }});
                        if (card) {{
                            card.scrollIntoView({{ behavior: 'instant', block: 'center' }});
                            card.click();
                            return true;
                        }}
                        return false;
                    }})()
                    """
                    res = await call("Runtime.evaluate", {"expression": click_card_js, "returnByValue": True})
                    if res.get("result", {}).get("value") is True:
                        clicked = True
                        break
                    await asyncio.sleep(0.3)

                assert clicked, f"Failed to find or click reordered card #{i+1} ({exp['title']})"
                await asyncio.sleep(1.5)

                path_res = await call("Runtime.evaluate", {"expression": "window.location.pathname"})
                current_path = path_res["result"]["value"]
                print(f"  Reordered Nav Click #{i+1}: '{exp['title']}' -> '{current_path}' (expected '{exp['expected_route']}')", flush=True)
                assert current_path == exp["expected_route"], f"Route mismatch for {exp['title']}: expected {exp['expected_route']}, got {current_path}"

            print("[Check 4] ALL 8 REORDERED MODULE NAVIGATION LINKS VERIFIED SUCCESSFULLY!", flush=True)
            print("=== ALL VERIFICATIONS PASSED 100% ===", flush=True)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(run_verification())
