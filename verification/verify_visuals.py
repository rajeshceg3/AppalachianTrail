from playwright.sync_api import sync_playwright
import time

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--use-gl=swiftshader"]
        )
        page = browser.new_page()
        page.set_default_timeout(60000)

        # Capture console logs
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        try:
            print("Navigating...")
            page.goto("http://localhost:5173")

            print("Waiting for Begin button...")
            begin_btn = page.get_by_text("Begin")
            begin_btn.wait_for()
            begin_btn.click()

            print("Waiting for Map View...")
            page.wait_for_timeout(5000) # Wait for animation

            # Click first region
            print("Clicking region...")
            # Use specific locator if possible, or just click coordinates
            # Wait for text
            page.get_by_text("Georgia").first.click()

            print("Waiting for Canvas...")
            page.wait_for_selector("canvas")
            print("Canvas found. Experience started.")

            # Wait for terrain generation
            time.sleep(20)

            # Take screenshot
            page.screenshot(path="verification/visual_check.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error_check.png")
            except:
                pass

        browser.close()

if __name__ == "__main__":
    verify_visuals()
