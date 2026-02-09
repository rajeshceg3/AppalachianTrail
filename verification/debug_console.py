from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Wait for potential errors
    time.sleep(5)

    try:
        page.wait_for_selector("button", timeout=5000)
        print("Found button, clicking...")
        page.click("button")
    except Exception as e:
        print(f"Error clicking button: {e}")

    # Wait for map
    time.sleep(2)
    try:
        print("Clicking Georgia...")
        page.click("text=Georgia")
    except Exception as e:
        print(f"Error clicking Georgia: {e}")

    # Wait for scene
    print("Waiting for scene...")
    time.sleep(10)

    page.screenshot(path="debug_screenshot.png")
    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
