from playwright.sync_api import sync_playwright
import time

def run_cuj(page):
    print("Navigating to game...")
    page.goto("http://localhost:8081")
    page.wait_for_timeout(10000)

    # Click the "JUGAR" button to start the game
    print("Clicking JUGAR button...")
    page.click("text=JUGAR")
    page.wait_for_timeout(1000)

    # Move ship to show trails and motion blur
    print("Moving ship...")
    page.keyboard.down("ArrowUp")
    page.keyboard.down("ArrowLeft")
    page.wait_for_timeout(4000)
    page.keyboard.up("ArrowUp")
    page.keyboard.up("ArrowLeft")

    # Shoot to show bullet streaks
    print("Shooting...")
    for _ in range(10):
        page.keyboard.press("Space")
        page.wait_for_timeout(200)

    # Show hyperspace
    print("Hyperspace...")
    page.keyboard.press("Shift")
    page.wait_for_timeout(2000)

    # Take final screenshot
    print("Taking final screenshot...")
    page.screenshot(path="verification/screenshots/gameplay.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
