import time
from playwright.sync_api import sync_playwright

def verify_immersion():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        print("Navigating to http://localhost:5173")
        try:
            page.goto("http://localhost:5173", timeout=60000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        # Wait for "Walk the Appalachian Trail" text
        print("Waiting for landing text...")
        try:
            page.wait_for_selector("text=Walk the Appalachian Trail", timeout=30000)
            print("Landing page loaded.")
        except:
            print("Landing page text not found. Screenshotting.")
            page.screenshot(path="verification/landing_fail.png")
            return

        # Click "Begin"
        print("Clicking Begin...")
        try:
            page.click("text=Begin")
        except:
             print("Begin button not found.")
             return

        # Wait for MapView
        print("Waiting for MapView...")
        time.sleep(2) # Transition

        # Click "Georgia"
        print("Clicking Georgia...")
        try:
            # The text might be uppercase in CSS but region.name is "Georgia"
            page.wait_for_selector("text=Georgia", timeout=10000)
            page.click("text=Georgia")
        except:
            print("Georgia not found.")
            page.screenshot(path="verification/map_fail.png")
            return

        # Wait for Scene (Experience)
        print("Waiting for Scene...")
        try:
            # Look for canvas
            page.wait_for_selector("canvas", timeout=30000)
            print("Canvas found.")
        except:
             print("Canvas not found.")
             page.screenshot(path="verification/scene_fail.png")
             return

        # Wait for 5s to simulate immersion/warming
        print("Waiting 5s for experience to settle...")
        time.sleep(5)

        # Screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/immersion_check.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_immersion()
