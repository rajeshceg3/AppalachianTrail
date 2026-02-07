from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Enable touch support in context
    context = browser.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    page = context.new_page()

    print("Navigating to app...")
    page.goto("http://localhost:5174")

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
    time.sleep(4)

    # Check Audio Button
    print("Checking Audio Button...")
    try:
        # Look for button with text AUDIO or MUTE
        audio_btn = page.wait_for_selector("button", timeout=5000)
        # We have multiple buttons (Back to Map, Audio). Need to find specific one.
        buttons = page.query_selector_all("button")
        audio_btn = None
        for btn in buttons:
            if "AUDIO" in btn.inner_text():
                audio_btn = btn
                break

        if audio_btn:
            print("Audio button found. Clicking to toggle...")
            audio_btn.click()
            time.sleep(1)
            # Verify text changes to MUTE
            content = page.content()
            if "MUTE" in content:
                print("Audio toggled successfully (Button text is MUTE).")
            else:
                print("Audio toggle failed (Text MUTE not found).")
        else:
            print("Audio button not found.")

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
