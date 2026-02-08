from playwright.sync_api import sync_playwright, expect

def verify_immersion():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        try:
            # 1. Navigate to Landing Page
            print("Navigating to landing page...")
            page.goto("http://localhost:5173")

            # Wait for the "Begin" button
            print("Waiting for 'Begin' button...")
            begin_button = page.get_by_role("button", name="Begin")
            expect(begin_button).to_be_visible(timeout=10000)

            # 2. Click "Begin"
            print("Clicking 'Begin'...")
            begin_button.click()

            # 3. Select 'Maine'
            print("Waiting for 'Maine' region...")
            # Use a more specific locator to avoid confusion with potential future text
            maine_card = page.get_by_text("Maine", exact=True)
            expect(maine_card).to_be_visible(timeout=10000)

            print("Clicking 'Maine'...")
            maine_card.click()

            # 4. Wait for Loader
            print("Waiting for loader text 'Entering Maine'...")
            loader_text = page.get_by_text("Entering Maine")
            expect(loader_text).to_be_visible(timeout=5000)

            # 5. Wait for Loader to Disappear
            print("Waiting for loader to disappear...")
            # Increase timeout just in case
            expect(loader_text).not_to_be_visible(timeout=20000)

            # Wait for scene stabilization
            page.wait_for_timeout(5000)

            # 6. Take Screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/verification.png")
            print("Screenshot saved to verification/verification.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            print("Error screenshot saved to verification/error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    verify_immersion()
