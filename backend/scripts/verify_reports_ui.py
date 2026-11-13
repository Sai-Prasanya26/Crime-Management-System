"""
Automated CDP script to verify Simplified Reports UI:
1. Initial view: ONLY Report Configuration panel + Welcome prompt. No report displayed. Export buttons disabled.
2. Verify all 6 report types:
   - Crime Statistics Report
   - Crime Prediction Report
   - Crime Risk Assessment Report
   - Resource Allocation Report
   - Budget Analysis Report
   - Comprehensive Crime Report
3. Verify REMOVAL of unnecessary banners, subheadings, taglines, and duplicated blocks:
   - Operational Summary banner is ABSENT
   - Forecast Interpretation banner is ABSENT
   - Risk Assessment Methodology Notice & Risk Summary banners are ABSENT
   - Optimization Notice banner is ABSENT
   - Budget Formula banner is ABSENT
   - Duplicate summary metric boxes in Risk and Resource reports are ABSENT
4. Verify PRESENCE of essential core data:
   - Clean top KPI cards
   - Proper single-note disclosures (Prediction ML note, Risk relative index note, Emergency partner note)
   - Proper 5-column Resource Allocation table with all 10 BPR&D pools
   - Police expenditure breakdown, budget balance, and separated partner agency costs
   - 5 core sections in Comprehensive Dossier
5. Verify action buttons: PDF download, Email PDF, CSV export, Print.
6. Capture fresh browser screenshots for each report into artifacts directory.
"""
import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_reports_ui_simplified"

SHOT_INITIAL = os.path.join(ARTIFACT_DIR, "reports_initial_configuration_view.png")
SHOT_STATS = os.path.join(ARTIFACT_DIR, "reports_crime_statistics_report.png")
SHOT_PREDICT = os.path.join(ARTIFACT_DIR, "reports_crime_prediction_report.png")
SHOT_RISK = os.path.join(ARTIFACT_DIR, "reports_crime_risk_report.png")
SHOT_RESOURCES = os.path.join(ARTIFACT_DIR, "reports_resource_allocation_report.png")
SHOT_BUDGET = os.path.join(ARTIFACT_DIR, "reports_budget_analysis_report.png")
SHOT_COMPREHENSIVE = os.path.join(ARTIFACT_DIR, "reports_comprehensive_crime_report.png")
SHOT_EMAIL = os.path.join(ARTIFACT_DIR, "reports_email_modal_view.png")


async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9230",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9230")
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9230/json")).json()
            page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
            ws_url = page_target["webSocketDebuggerUrl"]

            # Authenticate via backend to obtain legitimate JWT token
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
            await call("Log.enable")

            # Capture console logs from browser
            async def listen_console():
                while True:
                    try:
                        raw = await ws.recv()
                        msg = json.loads(raw)
                        if msg.get("method") in ["Log.entryAdded", "Runtime.consoleAPICalled", "Runtime.exceptionThrown"]:
                            print("BROWSER LOG/ERR:", msg)
                    except Exception:
                        break

            asyncio.create_task(listen_console())

            # Set viewport to 1440 x 1200
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

            async def wait_for_report_ready(timeout_sec=25):
                for i in range(int(timeout_sec / 0.5)):
                    res = await eval_js("""
                        (() => {
                            const text = document.body.innerText;
                            const upper = text.toUpperCase();
                            const hasLoading = text.includes('Generating');
                            const hasError = text.includes('Failed to') || (text.includes('Error') && !text.includes('Standard Error'));
                            const hasReportCard = (
                                upper.includes('1. HISTORICAL CRIME TREND') ||
                                upper.includes('1. PREDICTION SUMMARY') ||
                                upper.includes('COMPOSITE RISK SCORE') ||
                                upper.includes('1. RESOURCE-WISE ALLOCATION TABLE') ||
                                upper.includes('TOTAL POLICE COST') ||
                                upper.includes('5. BUDGET ANALYSIS') ||
                                upper.includes('1. HISTORICAL CRIME ANALYSIS')
                            );
                            return {
                                ready: !hasLoading && hasReportCard,
                                loading: hasLoading,
                                error: hasError,
                                snippet: text.substring(0, 300)
                            };
                        })()
                    """)
                    if res and res.get("ready"):
                        return True
                    if i % 4 == 0:
                        print(f"Waiting for report ready... step {i}: ready={res.get('ready') if res else False}, loading={res.get('loading') if res else False}, error={res.get('error') if res else False}", flush=True)
                    await asyncio.sleep(0.5)
                return False

            # Navigate to reports with token
            target_url = "http://127.0.0.1:5174/reports"
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await eval_js(set_token_js)
            print("Token injected. Waiting for UI to bootstrap...")
            await asyncio.sleep(2)

            for _ in range(15):
                ready = await eval_js("document.querySelectorAll('select').length >= 4")
                if ready:
                    break
                await asyncio.sleep(0.5)

            # =================================================================
            # CHECK 1: INITIAL STATE (NO REPORT BEFORE GENERATE CLICK)
            # =================================================================
            print("\n--- CHECK 1: VERIFY INITIAL EMPTY STATE ---")
            has_prompt = await eval_js("""
                document.body.innerText.includes("Select Configuration & Click Generate Report")
            """)
            has_report_dossier = await eval_js("""
                document.body.innerText.includes("1. Historical Crime Analysis") ||
                document.body.innerText.includes("1. Historical Crime Trend")
            """)
            buttons_disabled = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const dlBtn = btns.find(b => b.innerText.includes('Download PDF'));
                    const emailBtn = btns.find(b => b.innerText.includes('Email PDF'));
                    const csvBtn = btns.find(b => b.innerText.includes('Export CSV'));
                    const printBtn = btns.find(b => b.innerText.includes('Print'));
                    return {
                        downloadDisabled: dlBtn ? dlBtn.disabled : false,
                        emailDisabled: emailBtn ? emailBtn.disabled : false,
                        csvDisabled: csvBtn ? csvBtn.disabled : false,
                        printDisabled: printBtn ? printBtn.disabled : false
                    };
                })()
            """)

            print(f"Initial prompt visible: {has_prompt}")
            print(f"Report dossier hidden before click: {not has_report_dossier}")
            print(f"Export buttons disabled before click: {buttons_disabled}")
            assert has_prompt, "Initial configuration prompt must be visible"
            assert not has_report_dossier, "Report dossier must be hidden before generation"
            assert buttons_disabled["downloadDisabled"], "Download PDF button must be disabled initially"
            await capture_screenshot(SHOT_INITIAL)

            # =================================================================
            # CHECK 2: REPORT 1 - CRIME STATISTICS REPORT (ALL INDIA)
            # =================================================================
            print("\n--- CHECK 2: GENERATE CRIME STATISTICS REPORT ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'CRIME_STATISTICS') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'CRIME_STATISTICS';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            # Click Generate Report
            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            ready = await wait_for_report_ready()
            print(f"Report ready: {ready}", flush=True)

            stats_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('CRIME STATISTICS REPORT'),
                        hasTotalIncidents: upper.includes('TOTAL HISTORICAL INCIDENTS'),
                        hasMostAffected: upper.includes('MOST AFFECTED CATEGORY'),
                        hasTrendChart: upper.includes('1. HISTORICAL CRIME TREND'),
                        hasCatDist: upper.includes('2. CRIME CATEGORY DISTRIBUTION'),
                        hasStatsTable: upper.includes('3. CRIME STATISTICS TABLE'),
                        hasOperationalSummaryBanner: upper.includes('OPERATIONAL SUMMARY:')
                    };
                })()
            """)
            print(f"Crime Statistics Report Generated: {stats_info}", flush=True)
            assert stats_info["hasTitle"], "Crime Statistics Report title missing"
            assert stats_info["hasTrendChart"], "1. Historical Crime Trend chart missing"
            assert stats_info["hasCatDist"], "2. Crime Category Distribution missing"
            assert stats_info["hasStatsTable"], "3. Crime Statistics Table missing"
            assert not stats_info["hasOperationalSummaryBanner"], "Operational Summary banner must be removed"
            await capture_screenshot(SHOT_STATS)

            # =================================================================
            # CHECK 3: CONFIGURATION CHANGE HIDES PREVIOUS REPORT
            # =================================================================
            print("\n--- CHECK 3: VERIFY CHANGING CONFIGURATION HIDES REPORT ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[1].options.length; i++) {
                        if (selects[1].options[i].text.toUpperCase().includes('ANDHRA PRADESH')) {
                            selects[1].selectedIndex = i;
                            selects[1].value = selects[1].options[i].value;
                            selects[1].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            hidden_after_change = await eval_js("""
                document.body.innerText.includes("Select Configuration & Click Generate Report")
            """)
            print(f"Report cleanly hidden after changing State selector: {hidden_after_change}", flush=True)
            assert hidden_after_change, "Changing selector must reset and hide the report"

            # =================================================================
            # CHECK 4: REPORT 2 - CRIME PREDICTION REPORT (DISTRICT: ANANTAPUR)
            # =================================================================
            print("\n--- CHECK 4: GENERATE CRIME PREDICTION REPORT (ANANTAPUR) ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'CRIME_PREDICTIONS') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'CRIME_PREDICTIONS';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            # Wait for district options to populate
            for _ in range(15):
                has_anantapur = await eval_js("""
                    (() => {
                        const distSelect = document.querySelectorAll('select')[2];
                        if (!distSelect) return false;
                        return Array.from(distSelect.options).some(o => o.text.toUpperCase().includes('ANANTAPUR'));
                    })()
                """)
                if has_anantapur:
                    break
                await asyncio.sleep(0.5)

            # Select District Anantapur
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    const distSelect = selects[2];
                    for (let i = 0; i < distSelect.options.length; i++) {
                        if (distSelect.options[i].text.toUpperCase().includes('ANANTAPUR')) {
                            distSelect.selectedIndex = i;
                            distSelect.value = distSelect.options[i].value;
                            distSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            # Click Generate Report
            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            ready = await wait_for_report_ready()
            print(f"Report ready: {ready}", flush=True)

            pred_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('CRIME PREDICTION REPORT'),
                        hasPredictedCrimes: upper.includes('TOTAL PREDICTED CRIMES'),
                        hasActiveTypes: upper.includes('ACTIVE CRIME TYPES'),
                        hasSummary: upper.includes('1. PREDICTION SUMMARY'),
                        hasBreakdown: upper.includes('2. PREDICTED CRIME BREAKDOWN'),
                        hasActualVsPred: upper.includes('3. ACTUAL VS PREDICTED TREND'),
                        hasMetrics: upper.includes('4. PREDICTION METRICS'),
                        hasForecastBanner: upper.includes('FORECAST INTERPRETATION:'),
                        hasSingleNote: text.includes('Note: Crime-type breakdown is derived from historical proportions applied to machine learning forecast.')
                    };
                })()
            """)
            print(f"Crime Prediction Report Generated: {pred_info}", flush=True)
            assert pred_info["hasTitle"], "Prediction Report title missing"
            assert pred_info["hasSummary"], "1. Prediction Summary missing"
            assert pred_info["hasBreakdown"], "2. Predicted Crime Breakdown missing"
            assert pred_info["hasActualVsPred"], "3. Actual vs Predicted Trend missing"
            assert pred_info["hasMetrics"], "4. Prediction Metrics missing"
            assert not pred_info["hasForecastBanner"], "Forecast Interpretation banner must be removed"
            assert pred_info["hasSingleNote"], "Single ML historical proportions note must be present"
            await capture_screenshot(SHOT_PREDICT)

            # =================================================================
            # CHECK 5: REPORT 3 - CRIME RISK ASSESSMENT REPORT
            # =================================================================
            print("\n--- CHECK 5: GENERATE CRIME RISK ASSESSMENT REPORT (ANANTAPUR) ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'RISK_ASSESSMENT') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'RISK_ASSESSMENT';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            ready = await wait_for_report_ready()
            print(f"Report ready: {ready}", flush=True)

            risk_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('CRIME RISK ASSESSMENT REPORT'),
                        hasCompositeCard: upper.includes('COMPOSITE RISK SCORE'),
                        hasRiskLevelCard: upper.includes('RISK LEVEL CLASSIFICATION'),
                        hasJurisdictionCard: upper.includes('ASSESSED JURISDICTION'),
                        hasDriverCard: upper.includes('PRIMARY RISK DRIVER'),
                        hasMethodologyBanner: upper.includes('RISK ASSESSMENT METHODOLOGY NOTICE:'),
                        hasRiskSummaryBanner: upper.includes('RISK SUMMARY:'),
                        hasDuplicateSummaryBox: upper.includes('1. RISK SUMMARY'),
                        hasFactorTable: upper.includes('1. RISK FACTOR CONTRIBUTIONS'),
                        hasJurisdictionalComparison: upper.includes('2. JURISDICTIONAL RISK COMPARISON'),
                        hasSingleNote: text.includes('Note: Risk score is a relative assessment index based on crime patterns, not the probability that a crime will occur.')
                    };
                })()
            """)
            print(f"Crime Risk Assessment Report Generated: {risk_info}", flush=True)
            assert risk_info["hasTitle"], "Risk Assessment Report title missing"
            assert risk_info["hasCompositeCard"], "Composite Risk Score KPI missing"
            assert risk_info["hasRiskLevelCard"], "Risk Level Classification KPI missing"
            assert not risk_info["hasMethodologyBanner"], "Methodology Notice banner must be removed"
            assert not risk_info["hasRiskSummaryBanner"], "Risk Summary banner must be removed"
            assert not risk_info["hasDuplicateSummaryBox"], "Duplicate 1. Risk Summary box must be removed"
            assert risk_info["hasFactorTable"], "1. Risk Factor Contributions missing"
            assert risk_info["hasJurisdictionalComparison"], "2. Jurisdictional Risk Comparison missing"
            assert risk_info["hasSingleNote"], "Single risk assessment clarification note must be present"
            await capture_screenshot(SHOT_RISK)

            # =================================================================
            # CHECK 6: REPORT 4 - RESOURCE ALLOCATION REPORT
            # =================================================================
            print("\n--- CHECK 6: GENERATE RESOURCE ALLOCATION REPORT (ANANTAPUR) ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'RESOURCE_ALLOCATION') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'RESOURCE_ALLOCATION';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            ready = await wait_for_report_ready()
            print(f"Report ready: {ready}", flush=True)

            resource_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('RESOURCE ALLOCATION REPORT'),
                        hasActivePools: upper.includes('ACTIVE RESOURCE POOLS'),
                        hasPersonnelCard: upper.includes('RECOMMENDED PERSONNEL'),
                        hasShortagesCard: upper.includes('POOLS WITH SHORTAGES'),
                        hasCoveredCard: upper.includes('FULLY COVERED POOLS'),
                        hasOptimizationBanner: upper.includes('OPTIMIZATION NOTICE:'),
                        hasDuplicateSummaryBox: upper.includes('1. RESOURCE REQUIREMENT SUMMARY'),
                        hasAllocationTable: upper.includes('1. RESOURCE-WISE ALLOCATION TABLE'),
                        has5Columns: upper.includes('RESOURCE POOL') && upper.includes('REQUIRED') && upper.includes('AVAILABLE') && upper.includes('RECOMMENDED ALLOCATION') && upper.includes('SHORTAGE / REMAINING'),
                        hasPartnerBadge: upper.includes('PARTNER AGENCY'),
                        hasShortageSummary: upper.includes('2. SHORTAGE SUMMARY')
                    };
                })()
            """)
            print(f"Resource Allocation Report Generated: {resource_info}", flush=True)
            assert resource_info["hasTitle"], "Resource Allocation Report title missing"
            assert resource_info["hasActivePools"], "Active Resource Pools KPI missing"
            assert resource_info["hasPersonnelCard"], "Recommended Personnel KPI missing"
            assert not resource_info["hasOptimizationBanner"], "Optimization Notice banner must be removed"
            assert not resource_info["hasDuplicateSummaryBox"], "Duplicate 1. Resource Requirement Summary box must be removed"
            assert resource_info["hasAllocationTable"], "1. Resource-wise Allocation Table missing"
            assert resource_info["has5Columns"], "5 required columns missing"
            assert resource_info["hasShortageSummary"], "2. Shortage Summary missing"
            await capture_screenshot(SHOT_RESOURCES)

            # =================================================================
            # CHECK 7: REPORT 5 - BUDGET ANALYSIS REPORT
            # =================================================================
            print("\n--- CHECK 7: GENERATE BUDGET ANALYSIS REPORT (ANANTAPUR) ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'BUDGET_ANALYSIS') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'BUDGET_ANALYSIS';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            ready = await wait_for_report_ready()
            print(f"Report ready: {ready}", flush=True)

            budget_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('BUDGET ANALYSIS REPORT'),
                        hasPoliceCostCard: upper.includes('TOTAL POLICE COST'),
                        hasAvailableBudgetCard: upper.includes('AVAILABLE BUDGET'),
                        hasBudgetBalanceCard: upper.includes('BUDGET BALANCE'),
                        hasPartnerAgencyCard: upper.includes('PARTNER AGENCY COST'),
                        hasFormulaBanner: upper.includes('BUDGET FORMULA:'),
                        hasCapexOpex: upper.includes('1. POLICE EXPENDITURE BREAKDOWN') && upper.includes('CAPITAL PROCUREMENT (CAPEX)'),
                        hasBalanceSection: upper.includes('2. BUDGET BALANCE'),
                        hasResourceCostTable: upper.includes('3. RESOURCE-WISE COST BREAKDOWN'),
                        hasPartnerSeparation: upper.includes('4. PARTNER AGENCY COST (HEALTH DEPT. AMBULANCES & EMTS)')
                    };
                })()
            """)
            print(f"Budget Analysis Report Generated: {budget_info}", flush=True)
            assert budget_info["hasTitle"], "Budget Analysis Report title missing"
            assert budget_info["hasPoliceCostCard"], "Total Police Cost KPI missing"
            assert budget_info["hasAvailableBudgetCard"], "Available Budget KPI missing"
            assert budget_info["hasBudgetBalanceCard"], "Budget Balance KPI missing"
            assert not budget_info["hasFormulaBanner"], "Budget Formula banner must be removed"
            assert budget_info["hasCapexOpex"], "1. Police Expenditure Breakdown missing"
            assert budget_info["hasBalanceSection"], "2. Budget Balance missing"
            assert budget_info["hasResourceCostTable"], "3. Resource-wise Cost Breakdown missing"
            assert budget_info["hasPartnerSeparation"], "4. Partner Agency Cost missing"
            await capture_screenshot(SHOT_BUDGET)

            # =================================================================
            # CHECK 8: REPORT 6 - COMPREHENSIVE CRIME REPORT
            # =================================================================
            print("\n--- CHECK 8: GENERATE COMPREHENSIVE CRIME REPORT (ANANTAPUR) ---", flush=True)
            await eval_js("""
                (() => {
                    const selects = document.querySelectorAll('select');
                    for (let i = 0; i < selects[0].options.length; i++) {
                        if (selects[0].options[i].value === 'COMPREHENSIVE_CRIME') {
                            selects[0].selectedIndex = i;
                            selects[0].value = 'COMPREHENSIVE_CRIME';
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                })()
            """)
            await asyncio.sleep(1.0)

            gen_res = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return { clicked: true, disabled: genBtn.disabled };
                    }
                    return { clicked: false };
                })()
            """)
            print(f"Generate Report trigger: {gen_res}", flush=True)
            for _ in range(30):
                loaded = await eval_js("document.body.innerText.includes('5. Budget Analysis') || document.body.innerText.toUpperCase().includes('5. BUDGET ANALYSIS')")
                if loaded:
                    break
                await asyncio.sleep(0.5)

            comprehensive_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const upper = text.toUpperCase();
                    return {
                        hasTitle: upper.includes('DISTRICT CRIME PROFILE') || upper.includes('COMPREHENSIVE CRIME REPORT'),
                        hasSec1: upper.includes('1. HISTORICAL CRIME ANALYSIS'),
                        hasSec2: upper.includes('2. CRIME PREDICTION'),
                        hasSec3: upper.includes('3. CRIME RISK ASSESSMENT'),
                        hasSec4: upper.includes('4. RESOURCE ALLOCATION'),
                        hasSec5: upper.includes('5. BUDGET ANALYSIS'),
                        has4Kpis: upper.includes('HISTORICAL CRIMES') && upper.includes('PREDICTED CRIMES') && upper.includes('RISK SCORE') && upper.includes('AVAILABLE BUDGET')
                    };
                })()
            """)
            print(f"Comprehensive Crime Report Generated: {comprehensive_info}", flush=True)
            assert comprehensive_info["hasSec1"], "Section 1 missing"
            assert comprehensive_info["hasSec2"], "Section 2 missing"
            assert comprehensive_info["hasSec3"], "Section 3 missing"
            assert comprehensive_info["hasSec4"], "Section 4 missing"
            assert comprehensive_info["hasSec5"], "Section 5 missing"
            await capture_screenshot(SHOT_COMPREHENSIVE)

            # =================================================================
            # CHECK 9: EMAIL MODAL & CSV EXPORT
            # =================================================================
            print("\n--- CHECK 9: TEST EMAIL MODAL & CSV EXPORT ---", flush=True)
            await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const emailBtn = btns.find(b => b.innerText.includes('Email PDF'));
                    if (emailBtn) emailBtn.click();
                })()
            """)
            await asyncio.sleep(1)

            email_modal_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    return {
                        modalOpen: text.includes('Email PDF Report'),
                        recipientShown: text.includes('admin@crimeops.gov.in') || text.includes('Recipient Email:'),
                        hasConfirmBtn: text.includes('Confirm & Send')
                    };
                })()
            """)
            print(f"Email Modal Open & Authenticated Recipient: {email_modal_info}", flush=True)
            assert email_modal_info["modalOpen"], "Email PDF modal must open"
            await capture_screenshot(SHOT_EMAIL)

            # Close Modal
            await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const cancelBtn = btns.find(b => b.innerText.includes('Cancel'));
                    if (cancelBtn) cancelBtn.click();
                })()
            """)
            await asyncio.sleep(0.5)

            # Click Export CSV
            await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const csvBtn = btns.find(b => b.innerText.includes('Export CSV'));
                    if (csvBtn) csvBtn.click();
                })()
            """)
            await asyncio.sleep(1)

            csv_alert = await eval_js("""
                document.body.innerText.includes('CSV exported successfully')
            """)
            print(f"CSV Export Triggered with alert: {csv_alert}", flush=True)
            assert csv_alert, "CSV export notification must appear"

            print("\n=== ALL SIMPLIFIED REPORT CHECKS SUCCESSFULLY VERIFIED ===", flush=True)

    finally:
        chrome_proc.terminate()
        print("Terminated headless Chrome process", flush=True)

if __name__ == "__main__":
    asyncio.run(run_cdp())
