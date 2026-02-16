from playwright.sync_api import sync_playwright
import time
import sys

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--use-gl=swiftshader", "--no-sandbox"]
        )
        page = browser.new_page()
        page.set_default_timeout(120000) # 2 min timeout

        # Capture console logs and print to stdout immediately
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}", file=sys.stdout))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}", file=sys.stderr))

        try:
            print("Navigating...")
            page.goto("http://localhost:5173")

            print("Waiting for Begin button...")
            begin_btn = page.get_by_text("Begin")
            begin_btn.wait_for()
            begin_btn.click()

            print("Waiting for Map View...")
            page.wait_for_timeout(5000)

            print("Clicking region 'Georgia'...")
            # Try to force click if hidden/obscured, or scroll into view
            georgia = page.get_by_text("Georgia").first
            georgia.scroll_into_view_if_needed()
            georgia.click()

            print("Waiting for Canvas...")
            page.wait_for_selector("canvas")
            print("Canvas found. Experience started.")

            # Wait for terrain generation and stabilization
            print("Waiting 10s for generation...")
            time.sleep(10)

            # Take initial screenshot
            page.screenshot(path="verification/visual_check_initial.png")
            print("Initial screenshot saved.")

            # Try to move camera
            print("Moving camera...")
            page.keyboard.press("ArrowUp")
            time.sleep(0.5)
            page.keyboard.press("ArrowUp")
            time.sleep(0.5)
            page.keyboard.press("ArrowUp") # Move forward

            time.sleep(2)

            # Take screenshot
            page.screenshot(path="verification/visual_check_moved.png")
            print("Moved screenshot saved.")

        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            try:
                page.screenshot(path="verification/error_check.png")
            except:
                pass

        browser.close()

if __name__ == "__main__":
    verify_visuals()
