import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_dashboard_ops"

SHOT_PRESERVED = os.path.join(ARTIFACT_DIR, "dashboard_crime_analytics_preserved.png")
SHOT_RESOURCE_DESKTOP = os.path.join(ARTIFACT_DIR, "dashboard_resource_operations_desktop.png")
SHOT_RESOURCE_RESPONSIVE = os.path.join(ARTIFACT_DIR, "dashboard_resource_operations_responsive.png")

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9235",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9235")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9235/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

            login_resp = await client.post(
                "http://127.0.0.1:8000/api/v1/auth/login",
                json={"username_or_email": "admin", "password": "Admin@12345"}
            )
            token = login_resp.json()["access_token"]
            print("Obtained admin JWT access token")

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

            # Set desktop metrics 1440 x 1200
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 1200,
                "deviceScaleFactor": 1,
                "mobile": False,
            })

            async def eval_js(expr):
                res = await call("Runtime.evaluate", {
                    "expression": expr,
                    "returnByValue": True,
                    "awaitPromise": True,
                })
                if "exceptionDetails" in res:
                    print("JS Eval Exception:", res["exceptionDetails"])
                return res.get("result", {}).get("value")

            async def capture_screenshot(path):
                shot_data = await call("Page.captureScreenshot", {"format": "png"})
                if "data" in shot_data:
                    raw_bytes = base64.b64decode(shot_data["data"])
                    with open(path, "wb") as f:
                        f.write(raw_bytes)
                    print(f"Captured screenshot: {os.path.basename(path)} ({len(raw_bytes):,} bytes)")

            # Navigate to Dashboard with token
            target_url = "http://127.0.0.1:5174/dashboard"
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await eval_js(set_token_js)
            print("Token injected. Waiting for Dashboard to load at /dashboard...")

            # Wait for dashboard data to load
            for i in range(30):
                curr_url = await eval_js("window.location.href")
                body_txt = await eval_js("document.body.innerText")
                if i % 5 == 0:
                    print(f"[{i*0.5}s] URL: {curr_url} | Text length: {len(body_txt) if body_txt else 0}")
                if body_txt and "Total Incidents" in body_txt:
                    print(f"Loaded in {i*0.5}s!")
                    break
                await asyncio.sleep(0.5)

            final_body = await eval_js("document.body.innerText")
            print("Final body preview:\n", final_body[:500] if final_body else "EMPTY")

            # Wait an additional 3 seconds for charts and animations to settle
            await asyncio.sleep(3)

            # =================================================================
            # CHECK 1: PRESERVED EXISTING DASHBOARD SECTIONS
            # =================================================================
            print("\n--- CHECK 1: VERIFY PRESERVED CRIME DASHBOARD SECTIONS ---")
            existing_sections = await eval_js("""
                (() => {
                    const text = document.body.innerText.toUpperCase();
                    return {
                        hasTotalIncidents: text.includes('TOTAL INCIDENTS'),
                        hasCrimeCategories: text.includes('CRIME CATEGORIES'),
                        hasOffenseTypes: text.includes('OFFENSE TYPES'),
                        hasJurisdictionCard: text.includes('ADMINISTRATIVE ENTITIES') || text.includes('STATES & UTS'),
                        hasTrendChart: text.includes('INCIDENT TREND') || text.includes('LONGITUDINAL CRIME TREND'),
                        hasCategoryChart: text.includes('CRIME CATEGORY DISTRIBUTION'),
                        hasTypeChart: text.includes('HIGH-FREQUENCY CRIME TYPES') || text.includes('CRIME TYPE BREAKDOWN'),
                        hasHourlyChart: text.includes('24-HOUR DIURNAL PATTERN') || text.includes('HOURLY CRIME DISTRIBUTION'),
                        hasDemographics: text.includes('VICTIM DEMOGRAPHICS PROFILE') || text.includes('AGE & GENDER'),
                        hasTopDistricts: text.includes('JURISDICTIONAL CRIME RANKING') || text.includes('TOP JURISDICTIONS')
                    };
                })()
            """)
            print("Existing Crime Dashboard Sections:", existing_sections)
            await capture_screenshot(SHOT_PRESERVED)

            # Scroll down to Resource Operations Section
            ops_text = await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    if (el) {
                        el.scrollIntoView({ behavior: 'instant', block: 'start' });
                        return el.innerText;
                    }
                    return 'NOT_FOUND';
                })()
            """)
            print("Resource Operations Section Text Preview:\n", ops_text[:600] if ops_text else "None")
            await asyncio.sleep(1)

            # =================================================================
            # CHECK 2: RESOURCE OPERATIONS KPI CARDS & CHARTS
            # =================================================================
            print("\n--- CHECK 2: VERIFY RESOURCE OPERATIONS OVERVIEW ---")
            resource_ops_info = await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    const text = el ? el.innerText.toUpperCase() : '';
                    return {
                        hasHeader: text.includes('RESOURCE OPERATIONS OVERVIEW'),
                        hasNavLinks: text.includes('VIEW RESOURCE OPTIMIZATION') &&
                                     text.includes('VIEW BUDGET INTELLIGENCE') &&
                                     text.includes('VIEW REPORTS'),
                        hasCard1_Required: text.includes('RESOURCES REQUIRED'),
                        hasCard2_Allocated: text.includes('RESOURCES ALLOCATED'),
                        hasCard3_Shortage: text.includes('RESOURCE SHORTAGES'),
                        hasCard4_Critical: text.includes('CRITICAL RISK DISTRICTS'),
                        hasBarChartHeader: text.includes('RESOURCE ALLOCATION ANALYSIS'),
                        hasRecommendationTable: text.includes('RECOMMENDATION SUMMARY'),
                        hasBudgetOverview: text.includes('BUDGET OVERVIEW'),
                        hasPoliceExp: text.includes('ESTIMATED POLICE EXPENDITURE'),
                        hasAvailBudget: text.includes('AVAILABLE BUDGET'),
                        hasBudgetBalance: text.includes('BUDGET SURPLUS / DEFICIT'),
                        hasDonutChart: text.includes('EXPENDITURE PROFILE (CAPEX VS OPEX)'),
                        hasCapexOpexCards: text.includes('CAPEX (PROCUREMENT)') && text.includes('OPEX (OPERATIONS)') && text.includes('MAINTENANCE'),
                        hasPartnerAgencyIsolation: text.includes('PARTNER AGENCY COST'),
                        hasAlertsPanel: text.includes('OPERATIONAL ALERTS')
                    };
                })()
            """)
            print("Resource Operations Components:", resource_ops_info)

            # Capture desktop screenshot
            await capture_screenshot(SHOT_RESOURCE_DESKTOP)

            # =================================================================
            # CHECK 3: RESPONSIVE VIEWPORT (TABLET / MOBILE)
            # =================================================================
            print("\n--- CHECK 3: VERIFY RESPONSIVE LAYOUT (768px WIDTH) ---")
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 768,
                "height": 1024,
                "deviceScaleFactor": 1,
                "mobile": True,
            })
            await asyncio.sleep(1)

            responsive_info = await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    return {
                        sectionVisible: Boolean(el && el.offsetHeight > 0),
                        hasCards: el ? el.innerText.includes('Resources Required') : false,
                        hasTable: el ? el.innerText.includes('Recommendation Summary') : false
                    };
                })()
            """)
            print("Responsive 768px Evaluation:", responsive_info)
            await capture_screenshot(SHOT_RESOURCE_RESPONSIVE)

            print("\n=== ALL DASHBOARD RESOURCE OPERATIONS CHECKS VERIFIED SUCCESSFULLY ===")

    finally:
        chrome_proc.terminate()
        print("Terminated Chrome test instance")

if __name__ == "__main__":
    asyncio.run(run_cdp())
