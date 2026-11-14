import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_dashboard_ops_refined"

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
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9235", flush=True)
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
            print("Obtained admin JWT access token", flush=True)

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
                    print("JS Eval Exception:", res["exceptionDetails"], flush=True)
                return res.get("result", {}).get("value")

            async def capture_screenshot(path):
                shot_data = await call("Page.captureScreenshot", {"format": "png"})
                if "data" in shot_data:
                    raw_bytes = base64.b64decode(shot_data["data"])
                    with open(path, "wb") as f:
                        f.write(raw_bytes)
                    print(f"Captured screenshot: {os.path.basename(path)} ({len(raw_bytes):,} bytes)", flush=True)

            # Navigate to Dashboard with token
            target_url = "http://127.0.0.1:5174/dashboard"
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await eval_js(set_token_js)
            print("Token injected. Waiting for Dashboard to load at /dashboard...", flush=True)

            # Wait for dashboard data to load
            for i in range(30):
                body_txt = await eval_js("document.body.innerText")
                if i % 4 == 0:
                    print(f"[{i*0.5}s] Text length: {len(body_txt) if body_txt else 0}", flush=True)
                if body_txt and "TOTAL INCIDENTS" in body_txt.upper():
                    print(f"Loaded in {i*0.5}s!", flush=True)
                    break
                await asyncio.sleep(0.5)

            # Settle charts
            await asyncio.sleep(3)

            # =================================================================
            # CHECK 1: PRESERVED EXISTING DASHBOARD CRIME ANALYTICS SECTIONS
            # =================================================================
            print("\n--- CHECK 1: VERIFY PRESERVED CRIME DASHBOARD SECTIONS ---", flush=True)
            existing_sections = await eval_js("""
                (() => {
                    const text = document.body.innerText.toUpperCase();
                    return {
                        hasTotalIncidents: text.includes('TOTAL INCIDENTS'),
                        hasCrimeCategories: text.includes('CRIME CATEGORIES'),
                        hasOffenseTypes: text.includes('OFFENSE TYPES'),
                        hasJurisdictionCard: text.includes('ADMINISTRATIVE ENTITIES') || text.includes('STATES & UTS'),
                        hasTrendChart: text.includes('CRIME TREND ANALYSIS'),
                        hasCategoryChart: text.includes('CRIME CATEGORY DISTRIBUTION'),
                        hasTypeChart: text.includes('LEGAL CRIME TYPE DISTRIBUTION'),
                        hasHourlyChart: text.includes('24-HOUR DIURNAL PATTERN'),
                        hasDemographics: text.includes('VICTIM DEMOGRAPHICS PROFILE'),
                        hasWeapons: text.includes('WEAPON INVOLVEMENT PROFILE'),
                        hasTopDistricts: text.includes('DISTRICT CRIME COMPARISON & RANKING')
                    };
                })()
            """)
            print(f"Preserved Sections Status: {existing_sections}", flush=True)
            assert existing_sections["hasTotalIncidents"], "Total Incidents KPI must be preserved"
            assert existing_sections["hasTrendChart"], "Trend chart must be preserved"
            assert existing_sections["hasCategoryChart"], "Category chart must be preserved"
            assert existing_sections["hasTypeChart"], "Type breakdown must be preserved"
            assert existing_sections["hasHourlyChart"], "Hourly chart must be preserved"
            assert existing_sections["hasDemographics"], "Demographics profile must be preserved"
            assert existing_sections["hasWeapons"], "Weapons profile must be preserved"
            assert existing_sections["hasTopDistricts"], "Top districts ranking must be preserved"
            await capture_screenshot(SHOT_PRESERVED)

            # Scroll down to Resource Operations Overview section
            await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    if (el) {
                        el.scrollIntoView({ behavior: 'instant', block: 'start' });
                    }
                })()
            """)

            # Wait for Resource Operations section to finish loading
            print("Waiting for Operations Overview data to aggregate...", flush=True)
            for i in range(30):
                is_loading = await eval_js("""
                    (() => {
                        const el = document.getElementById('operations-overview-section');
                        if (!el) return true;
                        return el.innerText.includes('Aggregating');
                    })()
                """)
                if not is_loading:
                    print(f"Operations Overview ready in {i*0.5}s!", flush=True)
                    break
                await asyncio.sleep(0.5)

            ops_text = await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    return el ? el.innerText : 'NOT_FOUND';
                })()
            """)
            print("Resource Operations Section Text Preview:\n", ops_text[:400] if ops_text else "None", flush=True)
            await asyncio.sleep(1)

            # =================================================================
            # CHECK 2: RESOURCE OPERATIONS OVERVIEW REFINEMENTS
            # =================================================================
            print("\n--- CHECK 2: VERIFY REFINED RESOURCE OPERATIONS OVERVIEW ---", flush=True)
            resource_ops_info = await eval_js("""
                (() => {
                    const el = document.getElementById('operations-overview-section');
                    const text = el ? el.innerText.toUpperCase() : '';
                    return {
                        hasHeader: text.includes('RESOURCE OPERATIONS OVERVIEW'),
                        hasSubtitleFluff: text.includes('TACTICAL RESOURCE OPTIMIZATION, CAPACITY CONSTRAINTS'),
                        hasNavOptimization: text.includes('VIEW RESOURCE OPTIMIZATION'),
                        hasNavBudget: text.includes('VIEW BUDGET INTELLIGENCE'),
                        hasNavReports: text.includes('VIEW REPORTS'),
                        hasCard1_ActivePools: text.includes('ACTIVE RESOURCE POOLS'),
                        hasCard2_Required: text.includes('RESOURCES REQUIRED'),
                        hasCard3_Allocated: text.includes('RESOURCES ALLOCATED'),
                        hasCard4_Shortage: text.includes('RESOURCE SHORTAGES'),
                        hasBarChartHeader: text.includes('RESOURCE ALLOCATION ANALYSIS'),
                        hasBarChartLegend: text.includes('REQUIRED') && text.includes('AVAILABLE') && text.includes('ALLOCATED'),
                        hasResourceSummaryTable: text.includes('RESOURCE SUMMARY'),
                        hasTableColumns: text.includes('RESOURCE POOL') && text.includes('REQUIRED') && text.includes('AVAILABLE') && text.includes('ALLOCATED') && text.includes('SHORTAGE'),
                        hasBudgetOverview: text.includes('BUDGET OVERVIEW'),
                        hasPoliceExp: text.includes('ESTIMATED POLICE EXPENDITURE'),
                        hasAvailBudget: text.includes('AVAILABLE BUDGET'),
                        hasBudgetBalance: text.includes('BUDGET SURPLUS / DEFICIT'),
                        hasCapexOpexCards: text.includes('CAPEX') && text.includes('OPEX') && text.includes('MAINTENANCE'),
                        hasPartnerAgencyCost: text.includes('PARTNER AGENCY COST'),
                        hasAlertsPanel: text.includes('OPERATIONAL ALERTS')
                    };
                })()
            """)
            print(f"Refined Resource Operations Components: {resource_ops_info}", flush=True)

            assert resource_ops_info["hasHeader"], "Resource Operations Overview heading must be present"
            assert not resource_ops_info["hasSubtitleFluff"], "Subtitle tagline must be removed"
            assert not resource_ops_info["hasNavOptimization"], "View Resource Optimization button must be removed"
            assert not resource_ops_info["hasNavBudget"], "View Budget Intelligence button must be removed"
            assert not resource_ops_info["hasNavReports"], "View Reports button must be removed"
            assert resource_ops_info["hasCard1_ActivePools"], "Card 1: Active Resource Pools missing"
            assert resource_ops_info["hasCard2_Required"], "Card 2: Resources Required missing"
            assert resource_ops_info["hasCard3_Allocated"], "Card 3: Resources Allocated missing"
            assert resource_ops_info["hasCard4_Shortage"], "Card 4: Resource Shortages missing"
            assert resource_ops_info["hasBarChartHeader"], "Resource Allocation Analysis chart header missing"
            assert resource_ops_info["hasBarChartLegend"], "Bar chart Required/Available/Allocated legend missing"
            assert resource_ops_info["hasResourceSummaryTable"], "Resource Summary table missing"
            assert resource_ops_info["hasTableColumns"], "5 table columns missing"
            assert resource_ops_info["hasBudgetOverview"], "Budget Overview section missing"
            assert resource_ops_info["hasPoliceExp"], "Estimated Police Expenditure KPI missing"
            assert resource_ops_info["hasAvailBudget"], "Available Budget KPI missing"
            assert resource_ops_info["hasBudgetBalance"], "Budget Surplus / Deficit KPI missing"
            assert resource_ops_info["hasCapexOpexCards"], "CAPEX / OPEX / Maintenance cards missing"
            assert resource_ops_info["hasPartnerAgencyCost"], "Partner Agency Cost row missing"
            assert resource_ops_info["hasAlertsPanel"], "Operational Alerts panel missing"

            # Capture desktop screenshot
            await capture_screenshot(SHOT_RESOURCE_DESKTOP)

            # =================================================================
            # CHECK 3: RESPONSIVE VIEWPORT (768px TABLET / MOBILE)
            # =================================================================
            print("\n--- CHECK 3: VERIFY RESPONSIVE LAYOUT (768px WIDTH) ---", flush=True)
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
                    const text = el ? el.innerText.toUpperCase() : '';
                    return {
                        sectionVisible: Boolean(el && el.offsetHeight > 0),
                        hasCards: text.includes('ACTIVE RESOURCE POOLS'),
                        hasTable: text.includes('RESOURCE SUMMARY'),
                        hasBudget: text.includes('BUDGET OVERVIEW')
                    };
                })()
            """)
            print(f"Responsive 768px Evaluation: {responsive_info}", flush=True)
            assert responsive_info["sectionVisible"], "Section must be visible on 768px"
            assert responsive_info["hasCards"], "Cards must render on 768px"
            assert responsive_info["hasTable"], "Table must render on 768px"
            await capture_screenshot(SHOT_RESOURCE_RESPONSIVE)

            print("\n=== ALL DASHBOARD RESOURCE OPERATIONS CHECKS VERIFIED SUCCESSFULLY ===", flush=True)

    finally:
        chrome_proc.terminate()
        print("Terminated Chrome test instance", flush=True)

if __name__ == "__main__":
    asyncio.run(run_cdp())
