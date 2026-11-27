"""Browser smoke checks for Cellar Studio's current public site.

The first flagship product is not announced. Do not assert retired product
filters or redirect visitors to individual source repository pages.
"""
from pathlib import Path
import os

from playwright.sync_api import sync_playwright


BASE = 'http://127.0.0.1:8186/'
COMPANY_PAGES = [
    'about', 'licenses', 'certifications', 'privacy', 'terms', 'policies',
    'cookie-policy', 'refund-policy', 'business', 'contact',
]
ROUTES = (
    ['index', 'explore', 'services', 'downloads', 'handbook']
    + COMPANY_PAGES
    + [f.stem for f in Path('build/vercel').glob('*-downloads.html')]
    + [f.stem for f in Path('build/vercel').glob('product-*.html')]
    + [f.stem for f in Path('build/vercel').glob('service-*.html')]
)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ['CHROME_BIN'], args=['--no-sandbox']
    )
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    # Every published route should be readable without horizontal scrolling.
    for width in (320, 390, 768, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        for route in ROUTES:
            response = page.goto(BASE + route + '.html')
            assert response.status == 200, route
            assert page.locator('h1').count() == 1, route
            overflow = page.evaluate('document.documentElement.scrollWidth - innerWidth')
            assert overflow <= 1, (width, route, overflow)

    # A real no-data choice, persisted and reversible in the same browser.
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.goto(BASE + 'cookie-policy.html')
    page.get_by_role('button', name='Essential only').click()
    prefs = page.evaluate("JSON.parse(localStorage.getItem('cellar-privacy-preferences'))")
    assert prefs['embeds'] is False, prefs

    page.get_by_role('button', name='Manage privacy settings').click()
    dialog = page.get_by_role('dialog')
    assert dialog.is_visible()
    dialog.get_by_role('checkbox').check()
    dialog.get_by_role('button', name='Save preferences').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('cellar-privacy-preferences')).embeds") is True
    page.get_by_role('button', name='Open privacy settings').click()
    dialog.get_by_role('checkbox').uncheck()
    dialog.get_by_role('button', name='Save preferences').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('cellar-privacy-preferences')).embeds") is False

    # Consent is required. The copy-only builder must not claim to send data.
    page.goto(BASE + 'contact.html')
    page.get_by_role('button', name='Copy enquiry to clipboard').click()
    assert page.locator('#enquiry-consent').get_attribute('aria-invalid') == 'true'
    assert 'Nothing has been sent' in page.locator('#enquiry-status').inner_text()
    page.locator('#enquiry-topic').select_option(label='Collaboration idea')
    page.locator('#enquiry-message').fill('A sample project collaboration enquiry.')
    page.locator('#enquiry-consent').check()
    page.get_by_role('button', name='Copy enquiry to clipboard').click()
    status = page.locator('#enquiry-status').inner_text()
    assert 'not been sent' in status.lower() or 'nothing has been sent' in status.lower(), status
    page.get_by_role('button', name='Clear form').click()
    assert page.locator('#enquiry-message').input_value() == ''
    assert not page.locator('#enquiry-consent').is_checked()

    # Small-screen navigation has a keyboard-reachable open/close control.
    page.set_viewport_size({'width': 390, 'height': 780})
    page.goto(BASE + 'about.html')
    menu = page.get_by_role('button', name='Open navigation')
    assert menu.is_visible()
    menu.click()
    assert page.get_by_role('button', name='Close navigation').get_attribute('aria-expanded') == 'true'
    page.keyboard.press('Escape')
    assert page.get_by_role('button', name='Open navigation').get_attribute('aria-expanded') == 'false'

    assert not errors, errors
    print(f'Checked {len(ROUTES)} routes at four widths, privacy choices, enquiry validation and mobile menu.')
    browser.close()
