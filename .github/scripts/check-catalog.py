"""Browser smoke checks for Studio HQ and its only product, Cellar Guard."""
import os

from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import sync_playwright


BASE = 'http://127.0.0.1:8186/'
COMPANY_PAGES = [
    'about', 'licenses', 'certifications', 'privacy', 'terms', 'policies',
    'cookie-policy', 'refund-policy', 'business', 'contact',
]
ROUTES = ['index', 'products', 'guard', 'manual', 'guide', 'walkthrough', 'handbook'] + COMPANY_PAGES


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

    # Verify validation and the email draft without opening an external app.
    page.goto(BASE + 'index.html')
    page.get_by_role('navigation').get_by_role('link', name='Contact us').filter(visible=True).first.click()
    assert page.url == BASE + 'contact.html'
    inbox = 'cellarcsv@gmail.com'
    assert page.get_by_role('link', name=inbox).get_attribute('href') == f'mailto:{inbox}'
    open_email = page.get_by_role('button', name='Open email app')
    draft_link = page.locator('#enquiry-draft-link')
    page.evaluate("document.querySelector('#enquiry-draft-link').addEventListener('click', event => event.preventDefault())")
    open_email.click()
    assert page.locator('#enquiry-consent').get_attribute('aria-invalid') == 'true'
    assert page.locator('#enquiry-topic').evaluate('element => element === document.activeElement')
    assert draft_link.get_attribute('href') is None

    page.locator('#enquiry-email').fill('invalid-address')
    page.locator('#enquiry-topic').select_option(label='Collaboration idea')
    message = 'A sample collaboration enquiry.\nTests: CSV & Java? Café.'
    page.locator('#enquiry-message').fill(message)
    page.locator('#enquiry-consent').press('Space')
    assert page.locator('#enquiry-consent').is_checked()
    open_email.click()
    assert page.locator('#enquiry-email').get_attribute('aria-invalid') == 'true'
    assert draft_link.get_attribute('href') is None

    page.locator('#enquiry-name').fill('Sample Visitor')
    page.locator('#enquiry-email').fill('visitor+test@example.com')
    open_email.click()
    draft = urlsplit(draft_link.get_attribute('href'))
    assert (draft.scheme, draft.path) == ('mailto', inbox)
    assert parse_qs(draft.query) == {
        'subject': ['Cellar Studio | Collaboration idea'],
        'body': ['Name: Sample Visitor\r\n\r\nPreferred reply email: visitor+test@example.com\r\n\r\n' +
                 message.replace('\n', '\r\n')],
    }
    assert 'Select Send in your email app.' in page.locator('#enquiry-status').inner_text()

    page.evaluate("Object.defineProperty(navigator, 'clipboard', {value: undefined})")
    page.get_by_role('button', name='Copy message').click()
    preview = page.get_by_role('textbox', name='Message to paste into your email')
    assert preview.is_visible()
    assert message in preview.input_value()
    page.get_by_role('button', name='Clear form').click()
    assert page.locator('#enquiry-message').input_value() == ''
    assert not page.locator('#enquiry-consent').is_checked()
    assert draft_link.get_attribute('href') is None
    assert not preview.is_visible()

    # Small-screen navigation has a keyboard-reachable open/close control.
    page.set_viewport_size({'width': 390, 'height': 780})
    page.goto(BASE + 'about.html')
    menu = page.get_by_role('button', name='Open navigation')
    assert menu.is_visible()
    menu.click()
    assert page.get_by_role('button', name='Close navigation').get_attribute('aria-expanded') == 'true'
    page.keyboard.press('Escape')
    assert page.get_by_role('button', name='Open navigation').get_attribute('aria-expanded') == 'false'

    # The homepage must promote one product and link to its public manual.
    page.goto(BASE + 'index.html')
    assert page.locator('.hero-copy').get_by_role('link', name='Explore our products').count() == 1
    assert page.locator('.hero-copy').get_by_role('link', name='Meet the team').count() == 1
    page.goto(BASE + 'products.html')
    assert page.locator('#coming-soon').count() == 1
    page.goto(BASE + 'manual.html')
    assert page.locator('#pr').count() == 1

    assert not errors, errors
    print(f'Checked {len(ROUTES)} routes at four widths, privacy choices, enquiry validation and mobile menu.')
    browser.close()
