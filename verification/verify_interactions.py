from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Enable touch support in context
    context = browser.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    page = context.new_page()

    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Landing Page
    print("Waiting for Begin button...")
    try:
        page.wait_for_selector("button", timeout=10000)
        # Just click the first button or specific text if we know it
        # Assuming landing page has a button to start
        buttons = page.query_selector_all("button")
        found = False
        for btn in buttons:
            if "Begin" in btn.inner_text() or "BEGIN" in btn.inner_text():
                print("Clicking Begin...")
                btn.click()
                found = True
                break
        if not found and buttons:
            print("Clicking first button found...")
            buttons[0].click()

    except Exception as e:
        print(f"Error on landing page: {e}")

    # Map View
    print("Waiting for Georgia region...")
    try:
        page.wait_for_selector("text=Georgia", timeout=10000)

        # Test Hover (Desktop)
        print("Hovering over Georgia...")
        page.hover("text=Georgia")
        time.sleep(1)

        print("Clicking Georgia...")
        page.click("text=Georgia")
    except Exception as e:
        print(f"Error on map view: {e}")
        return

    # Experience View
    print("Waiting for Scene to load...")
    try:
        # Wait for "Entering Georgia" loader text
        page.wait_for_selector("text=Entering", timeout=5000)
    except:
        print("Loader text might have passed quickly.")

    # Wait for loader to disappear and scene to stabilize
    # Animation takes 1.5s (loader) + 1.2s (delay) + 2s (fade) = ~4.7s.
    # Adding extra buffer.
    time.sleep(8)

    # Check Audio Button
    print("Checking Audio Button...")
    try:
        # Check if any button exists in DOM
        count = page.evaluate("document.querySelectorAll('button').length")
        print(f"Found {count} buttons in DOM.")

        if count > 0:
            # Check visibility of first button
            is_visible = page.evaluate("document.querySelector('button').offsetParent !== null")
            print(f"First button visible: {is_visible}")

            # Check opacity
            opacity = page.evaluate("window.getComputedStyle(document.querySelector('button')).opacity")
            print(f"First button opacity: {opacity}")

        # Look for button with text AUDIO or MUTE
        # Use state='attached' to find it even if hidden
        audio_btn_loc = page.locator("button", has_text="AUDIO")
        if audio_btn_loc.count() > 0:
             print("Audio button locator found.")
             # Force click if needed or wait for visibility
             audio_btn_loc.first.click(force=True)
             print("Clicked Audio button (force).")
             time.sleep(1)
             content = page.content()
             if "MUTE" in content:
                 print("Audio toggled successfully.")
             else:
                 print("Audio toggle failed.")
        else:
            print("Audio button locator NOT found.")

    except Exception as e:
        print(f"Error checking audio: {e}")

    # Test Movement (W Key)
    print("Simulating W key press...")
    page.keyboard.down("w")
    time.sleep(1)
    page.keyboard.up("w")

    print("Taking screenshot...")
    page.screenshot(path="verification_interactions.png")

    browser.close()
    print("Verification script completed.")

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
