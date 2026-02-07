from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Landing Page
    print("Waiting for Begin button...")
    page.wait_for_selector("button:has-text('Begin')", timeout=10000)

    print("Clicking Begin...")
    page.click("button:has-text('Begin')")

    # Map View
    print("Waiting for Georgia region...")
    page.wait_for_selector("text=Georgia", timeout=10000)

    print("Clicking Georgia...")
    page.click("text=Georgia")

    # Experience View
    print("Waiting for Scene to load...")
    page.wait_for_selector("text=Entering Georgia", timeout=5000)

    # Wait for loader to disappear
    time.sleep(5)

    print("Taking screenshot...")
    page.screenshot(path="verification_scene.png")

    browser.close()
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
