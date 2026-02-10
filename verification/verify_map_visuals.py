from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 2000}) # Tall viewport to see more map

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Landing Page -> Click Begin
    page.wait_for_selector("button")
    buttons = page.query_selector_all("button")
    for btn in buttons:
        if "Begin" in btn.inner_text() or "BEGIN" in btn.inner_text():
            btn.click()
            break

    print("Waiting for Map View...")
    time.sleep(2) # Wait for transition
    page.wait_for_selector("text=The Path North")

    print("Taking Map View screenshot...")
    page.screenshot(path="verification_map.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
