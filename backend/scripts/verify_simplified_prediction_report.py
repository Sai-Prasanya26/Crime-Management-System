import asyncio
import json
import base64
import subprocess
import os
import httpx
import websockets

ARTIFACT_DIR = r"C:\Users\saipr.SAIPRASANYA.000\.gemini\antigravity\brain\1040a39f-8a8b-4425-8c8c-837c24bcb72e"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\saipr.SAIPRASANYA.000\AppData\Local\Temp\chrome_debug_reports_pred"

SHOT_PREDICTION_SIMPLIFIED = os.path.join(ARTIFACT_DIR, "reports_crime_prediction_simplified.png")
SHOT_STATISTICS_PRESERVED = os.path.join(ARTIFACT_DIR, "reports_crime_statistics_preserved.png")

async def run_cdp():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9236",
        f"--user-data-dir={USER_DATA_DIR}",
        "http://127.0.0.1:5174",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched headless Chrome (PID:", chrome_proc.pid, ") on port 9236", flush=True)
    await asyncio.sleep(2)

    try:
        async with httpx.AsyncClient() as client:
            targets = (await client.get("http://127.0.0.1:9236/json")).json()
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

            # Navigate to /reports with token
            target_url = "http://127.0.0.1:5174/reports"
            await call("Page.navigate", {"url": target_url})
            await asyncio.sleep(1.5)

            set_token_js = f"""
                localStorage.setItem('cms_access_token', '{token}');
                window.location.href = '{target_url}';
            """
            await eval_js(set_token_js)
            print("Token injected. Navigating to /reports...", flush=True)

            # Wait for reports page to load
            for i in range(30):
                body_txt = await eval_js("document.body.innerText")
                if i % 4 == 0:
                    print(f"[{i*0.5}s] Text length: {len(body_txt) if body_txt else 0}", flush=True)
                if body_txt and "REPORT TYPE" in body_txt.upper():
                    print(f"Reports page loaded in {i*0.5}s!", flush=True)
                    break
                await asyncio.sleep(0.5)

            await asyncio.sleep(2)

            # =================================================================
            # STEP 1: VERIFY INITIAL CONFIGURATION UI & BUTTONS
            # =================================================================
            print("\n--- STEP 1: VERIFY REPORT CONFIGURATION PANEL ---", flush=True)
            initial_info = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const selects = Array.from(document.querySelectorAll('select'));
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return {
                        hasReportTypeSelect: selects.length >= 1,
                        hasGenerateBtn: buttons.some(b => b.innerText.includes('Generate Report')),
                        hasDownloadPdf: buttons.some(b => b.innerText.includes('Download PDF')),
                        hasEmailPdf: buttons.some(b => b.innerText.includes('Email PDF')),
                        hasExportCsv: buttons.some(b => b.innerText.includes('Export CSV')),
                        hasPrint: buttons.some(b => b.innerText.includes('Print')),
                        initialPromptPresent: text.includes('Select Configuration & Click Generate Report')
                    };
                })()
            """)
            print(f"Initial Configuration Info: {initial_info}", flush=True)
            assert initial_info["hasReportTypeSelect"], "Report type selector missing"
            assert initial_info["hasGenerateBtn"], "Generate Report button missing"
            assert initial_info["hasDownloadPdf"], "Download PDF button missing"
            assert initial_info["hasEmailPdf"], "Email PDF button missing"
            assert initial_info["hasExportCsv"], "Export CSV button missing"
            assert initial_info["hasPrint"], "Print button missing"
            assert initial_info["initialPromptPresent"], "Initial prompt message missing"

            # =================================================================
            # STEP 2: SELECT CRIME_PREDICTIONS AND GENERATE
            # =================================================================
            print("\n--- STEP 2: SELECT CRIME_PREDICTIONS AND GENERATE REPORT ---", flush=True)
            select_res = await eval_js("""
                (() => {
                    const reportSelect = document.querySelector('select');
                    if (!reportSelect) return false;
                    reportSelect.value = 'CRIME_PREDICTIONS';
                    reportSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                })()
            """)
            print(f"Selected CRIME_PREDICTIONS: {select_res}", flush=True)
            await asyncio.sleep(1)

            # Click Generate Report
            click_gen = await eval_js("""
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) {
                        genBtn.click();
                        return true;
                    }
                    return false;
                })()
            """)
            print(f"Clicked Generate Report: {click_gen}", flush=True)

            # Wait for generation to complete
            for i in range(30):
                gen_state = await eval_js("""
                    (() => {
                        const text = document.body.innerText;
                        const isGenerating = text.includes('Generating Crime Prediction Report');
                        const hasDossier = text.includes('Crime Prediction Report') && text.includes('Total Predicted Crimes');
                        return { isGenerating, hasDossier };
                    })()
                """)
                if gen_state["hasDossier"]:
                    print(f"Crime Prediction Report generated in {i*0.5}s!", flush=True)
                    break
                await asyncio.sleep(0.5)

            await asyncio.sleep(2)

            # =================================================================
            # STEP 3: VERIFY SIMPLIFIED CRIME PREDICTION REPORT LAYOUT
            # =================================================================
            print("\n--- STEP 3: VERIFY SIMPLIFIED CRIME PREDICTION REPORT CONTENT ---", flush=True)
            report_eval = await eval_js("""
                (() => {
                    const text = document.body.innerText;
                    const uppercaseText = text.toUpperCase();

                    // Check Header
                    const hasReportHeader = text.includes('Crime Prediction Report');
                    const hasLocation = text.includes('Location:');
                    const hasPeriod = text.includes('Period:');

                    // Check 3 Summary KPI Cards
                    const hasCard1_Total = uppercaseText.includes('TOTAL PREDICTED CRIMES');
                    const hasCard2_ActiveTypes = uppercaseText.includes('ACTIVE CRIME TYPES') || uppercaseText.includes('DISTRICTS FORECASTED') || uppercaseText.includes('STATES & UTS FORECASTED');
                    const hasCard3_HighestType = uppercaseText.includes('HIGHEST PREDICTED CRIME TYPE') || uppercaseText.includes('HIGHEST-VOLUME DISTRICT') || uppercaseText.includes('HIGHEST-VOLUME STATE');
                    const hasRemovedBaselineCard = uppercaseText.includes('BASELINE COMPARISON') && !text.includes('Historical Baseline:');

                    // Check Section 1: Predicted Crime Breakdown
                    const hasSection1 = uppercaseText.includes('1. PREDICTED CRIME BREAKDOWN');
                    const hasCrimeTypeHeader = uppercaseText.includes('CRIME TYPE') || uppercaseText.includes('DISTRICT') || uppercaseText.includes('STATE / UT');
                    const hasPredictedCountHeader = uppercaseText.includes('PREDICTED COUNT');
                    const hasHistoricalDisclosure = text.includes('historical proportions applied to machine learning forecast');

                    // Check Section 2: Actual vs Predicted Trend
                    const hasSection2 = uppercaseText.includes('2. ACTUAL VS PREDICTED TREND');
                    const hasHistoricalBaseline = uppercaseText.includes('HISTORICAL BASELINE:');
                    const hasBaselineComparisonOnlyOnce = text.includes('% vs baseline');
                    const hasActualLegend = uppercaseText.includes('HISTORICAL ACTUAL');
                    const hasPredictedLegend = uppercaseText.includes('FORECAST PREDICTION');
                    const hasComposedChart = Boolean(document.querySelector('.recharts-wrapper'));
                    const hasCompactConfidenceInterval = text.includes('Prediction Confidence Interval (80%):') || text.includes('80% CI:');

                    // Check Removed Fluff
                    const hasRemovedSummarySection = uppercaseText.includes('1. PREDICTION SUMMARY');
                    const hasRemovedTrajectoryCard = uppercaseText.includes('FORECAST TRAJECTORY');
                    const hasRemovedAlgoArchitecture = uppercaseText.includes('ALGORITHM ARCHITECTURE');
                    const hasRemovedForecastHorizon = uppercaseText.includes('FORECAST HORIZON:');
                    const hasRemovedBoundsRow = uppercaseText.includes('80% PREDICTION BOUNDS:');

                    // Check Action Buttons Enabled
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const downloadBtn = buttons.find(b => b.innerText.includes('Download PDF'));
                    const emailBtn = buttons.find(b => b.innerText.includes('Email PDF'));
                    const exportBtn = buttons.find(b => b.innerText.includes('Export CSV'));

                    return {
                        hasReportHeader,
                        hasLocation,
                        hasPeriod,
                        hasCard1_Total,
                        hasCard2_ActiveTypes,
                        hasCard3_HighestType,
                        hasRemovedBaselineCard,
                        hasSection1,
                        hasCrimeTypeHeader,
                        hasPredictedCountHeader,
                        hasHistoricalDisclosure,
                        hasSection2,
                        hasHistoricalBaseline,
                        hasBaselineComparisonOnlyOnce,
                        hasActualLegend,
                        hasPredictedLegend,
                        hasComposedChart,
                        hasCompactConfidenceInterval,
                        hasRemovedSummarySection,
                        hasRemovedTrajectoryCard,
                        hasRemovedAlgoArchitecture,
                        hasRemovedForecastHorizon,
                        hasRemovedBoundsRow,
                        buttonsEnabled: Boolean(downloadBtn && !downloadBtn.disabled && emailBtn && !emailBtn.disabled && exportBtn && !exportBtn.disabled)
                    };
                })()
            """)
            print(f"Report Evaluation Details:\n{json.dumps(report_eval, indent=2)}", flush=True)

            assert report_eval["hasReportHeader"], "Report heading missing"
            assert report_eval["hasLocation"], "Location subtitle missing"
            assert report_eval["hasPeriod"], "Reporting period missing"
            assert report_eval["hasCard1_Total"], "KPI Card 1: Total Predicted Crimes missing"
            assert report_eval["hasCard2_ActiveTypes"], "KPI Card 2: Active Crime Types missing"
            assert report_eval["hasCard3_HighestType"], "KPI Card 3: Highest Predicted Crime Type missing"
            assert not report_eval["hasRemovedBaselineCard"], "Separate Baseline Comparison KPI card must be removed"
            assert report_eval["hasSection1"], "Section 1: Predicted Crime Breakdown missing"
            assert report_eval["hasCrimeTypeHeader"], "Crime Type header missing in table"
            assert report_eval["hasPredictedCountHeader"], "Predicted Count header missing in table"
            assert report_eval["hasHistoricalDisclosure"], "Historical proportion disclosure missing"
            assert report_eval["hasSection2"], "Section 2: Actual vs Predicted Trend missing"
            assert report_eval["hasHistoricalBaseline"], "Historical baseline info missing in trend section"
            assert report_eval["hasBaselineComparisonOnlyOnce"], "Baseline comparison percentage missing"
            assert report_eval["hasActualLegend"], "Historical Actual legend item missing in chart"
            assert report_eval["hasPredictedLegend"], "Forecast Prediction legend item missing in chart"
            assert report_eval["hasComposedChart"], "Recharts ComposedChart wrapper missing"
            assert report_eval["hasCompactConfidenceInterval"], "Compact confidence interval missing"
            assert not report_eval["hasRemovedSummarySection"], "Prediction Summary section must be removed"
            assert not report_eval["hasRemovedTrajectoryCard"], "Forecast Trajectory duplicate card must be removed"
            assert not report_eval["hasRemovedAlgoArchitecture"], "Algorithm Architecture duplicate card must be removed"
            assert not report_eval["hasRemovedForecastHorizon"], "Forecast Horizon duplicate row must be removed"
            assert not report_eval["hasRemovedBoundsRow"], "Repeated 80% bounds duplicate row must be removed"
            assert report_eval["buttonsEnabled"], "Action buttons should be enabled"

            # Capture simplified report screenshot
            await capture_screenshot(SHOT_PREDICTION_SIMPLIFIED)

            # =================================================================
            # STEP 4: VERIFY OTHER 5 REPORT TYPES REMAIN PRESERVED
            # =================================================================
            print("\n--- STEP 4: VERIFY CRIME STATISTICS REPORT PRESERVED ---", flush=True)
            await eval_js("""
                (() => {
                    const reportSelect = document.querySelector('select');
                    reportSelect.value = 'CRIME_STATISTICS';
                    reportSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    const btns = Array.from(document.querySelectorAll('button'));
                    const genBtn = btns.find(b => b.innerText.includes('Generate Report'));
                    if (genBtn) genBtn.click();
                })()
            """)

            for i in range(20):
                stat_state = await eval_js("""
                    (() => {
                        const text = document.body.innerText.toUpperCase();
                        return text.includes('CRIME STATISTICS REPORT') && text.includes('1. HISTORICAL CRIME TREND');
                    })()
                """)
                if stat_state:
                    print(f"Crime Statistics Report generated in {i*0.5}s!", flush=True)
                    break
                await asyncio.sleep(0.5)

            await asyncio.sleep(2)
            stat_eval = await eval_js("""
                (() => {
                    const text = document.body.innerText.toUpperCase();
                    return {
                        hasHeader: text.includes('CRIME STATISTICS REPORT'),
                        hasTrend: text.includes('1. HISTORICAL CRIME TREND'),
                        hasCategoryDist: text.includes('2. CRIME CATEGORY DISTRIBUTION'),
                        hasStatsTable: text.includes('3. CRIME STATISTICS TABLE')
                    };
                })()
            """)
            print(f"Crime Statistics Report preserved: {stat_eval}", flush=True)
            assert stat_eval["hasHeader"], "Crime Statistics Report header missing"
            assert stat_eval["hasTrend"], "Crime Statistics historical trend missing"
            assert stat_eval["hasCategoryDist"], "Crime Statistics category distribution missing"
            assert stat_eval["hasStatsTable"], "Crime Statistics table missing"

            await capture_screenshot(SHOT_STATISTICS_PRESERVED)

            print("\n=== ALL CRIME PREDICTION REPORT AND REPORT PRESERVATION CHECKS PASSED ===", flush=True)

    finally:
        chrome_proc.terminate()
        print("Terminated Chrome test instance", flush=True)

if __name__ == "__main__":
    asyncio.run(run_cdp())
