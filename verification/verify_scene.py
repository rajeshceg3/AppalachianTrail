from playwright.sync_api import sync_playwright
import time

def verify_scene():
    with sync_playwright() as p:
        # Launch with arguments to maybe help with WebGL?
        browser = p.chromium.launch(headless=True, args=[
            "--use-gl=swiftshader",
            "--enable-unsafe-swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blocklist"
        ])
        context = browser.new_context(viewport={"width": 400, "height": 300})
        page = context.new_page()

        # Listen to console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        print("Navigating to home...")
        page.goto("http://localhost:5173")

        # 1. Landing -> Map
        print("Clicking Begin...")
        # Wait for the button to appear (it has an animation delay)
        page.wait_for_timeout(4000)
        begin_btn = page.get_by_text("Begin")
        begin_btn.click()

        # 2. Map -> Experience
        print("Waiting for Map...")
        page.wait_for_timeout(2000)

        # Click on a region. Let's find "Georgia" or just the first region visible.
        # The regions are rendered in a list.
        # Let's try to click the first h3 text we find, or a specific region name if we knew it.
        # "Springer Mountain" is likely the first one (Georgia).
        # Or just click the first region node circle.

        # Let's just click the text "Springer Mountain" if it exists, or look for any h3
        try:
            region = page.locator("h3").first
            print(f"Clicking region: {region.inner_text()}")
            region.click()
        except:
            print("Could not find h3, dumping page content")
            print(page.content())
            browser.close()
            return

        # 3. Experience
        print("Waiting for Experience (Scene to load)...")
        # Wait for transition (MapView zoom out 1.5s + rendering)
        page.wait_for_timeout(5000)

        # Wait blindly for rendering
        print("Sleeping for 15s to allow scene to load...")
        time.sleep(15)

        count = page.locator("canvas").count()
        print(f"Canvas count: {count}")

        print("Taking screenshot...")
        page.screenshot(path="verification/scene_verification.png", timeout=60000, animations="disabled", caret="hide")
        print("Screenshot saved to verification/scene_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_scene()
