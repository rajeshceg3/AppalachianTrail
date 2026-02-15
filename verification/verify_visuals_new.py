from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Landing Page
    print("Waiting for Begin button...")
    try:
        page.wait_for_selector("button", timeout=15000)
        buttons = page.query_selector_all("button")
        found = False
        for btn in buttons:
            if "Begin" in btn.inner_text() or "BEGIN" in btn.inner_text():
                print("Clicking Begin...")
                btn.click()
                found = True
                break
        if not found and buttons:
            buttons[0].click()
    except Exception as e:
         print(f"Error on landing: {e}")
         page.screenshot(path="verification/error_landing.png")
         return

    # Map View
    print("Waiting for Georgia region...")
    try:
        page.wait_for_selector("text=Georgia", timeout=15000)
        print("Clicking Georgia...")
        page.click("text=Georgia")
    except Exception as e:
        print(f"Error on map view: {e}")
        # Take screenshot for debugging
        page.screenshot(path="verification/error_map.png")
        return

    # Experience View
    print("Waiting for Scene to load...")
    time.sleep(15) # Wait for scene to load and stabilize

    print("Taking screenshot...")
    page.screenshot(path="verification/visuals_check.png")

    browser.close()
    print("Verification script completed.")

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
