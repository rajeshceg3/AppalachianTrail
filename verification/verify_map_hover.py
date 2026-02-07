from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173")

        # Wait for "Begin" button and click
        print("Waiting for Begin...")
        page.wait_for_selector("text=Begin", timeout=10000)
        page.click("text=Begin")

        # Wait for MapView to load (look for "The Trail Path")
        print("Waiting for MapView...")
        page.wait_for_selector("text=The Trail Path", timeout=10000)

        # Find the "Georgia" region text
        print("Hovering over Georgia...")
        georgia = page.locator("text=Georgia")

        # Hover over it
        georgia.hover()

        # Wait for transition (glow effect)
        time.sleep(2)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/map_hover.png")
        print("Screenshot saved to verification/map_hover.png")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
