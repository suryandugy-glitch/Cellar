"""Browser smoke checks for Studio HQ and its only product, Cellar Guard."""
import json
import os
import re
from pathlib import Path

from urllib.parse import parse_qs

from playwright.sync_api import sync_playwright


BASE = 'http://127.0.0.1:8186/'
COMPANY_PAGES = [
    'about', 'licenses', 'certifications', 'privacy', 'terms', 'policies',
    'cookie-policy', 'refund-policy', 'business', 'contact',
]
ROUTES = ['index', 'products', 'guard', 'manual', 'guide', 'walkthrough', 'handbook', 'guard-app'] + COMPANY_PAGES


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

    # Use the production policy and intercept the external POST so CI never sends email.
    headers = json.loads(Path('vercel.json').read_text())['headers']
    policy = next(header['value'] for rule in headers for header in rule['headers']
                  if header['key'] == 'Content-Security-Policy')

    def serve_contact_with_policy(route):
        response = route.fetch()
        route.fulfill(response=response, headers={
            **response.headers, 'content-security-policy': policy,
        })

    page.route(BASE + 'contact.html', serve_contact_with_policy)
    endpoint = 'https://formsubmit.co/cellarcsv@gmail.com'
    submissions = []

    def receive_contact_post(route):
        request = route.request
        submissions.append((request.method, parse_qs(request.post_data or '')))
        route.fulfill(status=200, content_type='text/html', body='<h1>Message received</h1>')

    page.route(endpoint, receive_contact_post)
    page.goto(BASE + 'index.html')
    page.get_by_role('navigation').get_by_role('link', name='Contact us').filter(visible=True).first.click()
    assert page.url == BASE + 'contact.html'
    send = page.get_by_role('button', name='Send message')
    send.click()
    assert page.locator('#enquiry-consent').get_attribute('aria-invalid') == 'true'
    assert page.locator('#enquiry-topic').evaluate('element => element === document.activeElement')
    assert not submissions

    page.locator('#enquiry-email').fill('invalid-address')
    page.locator('#enquiry-topic').select_option(label='Collaboration idea')
    message = 'A sample collaboration enquiry.\nTests: CSV & Java? Café.'
    page.locator('#enquiry-message').fill(message)
    page.locator('#enquiry-consent').press('Space')
    assert page.locator('#enquiry-consent').is_checked()
    send.click()
    assert page.locator('#enquiry-email').get_attribute('aria-invalid') == 'true'
    assert not submissions

    page.get_by_role('button', name='Clear form').click()
    assert page.locator('#enquiry-message').input_value() == ''
    assert not page.locator('#enquiry-consent').is_checked()
    subjects = set()
    for attempt in range(2):
        if attempt:
            page.goto(BASE + 'contact.html')
        page.locator('#enquiry-name').fill('Sample Visitor')
        page.locator('#enquiry-email').fill('visitor+test@example.com')
        page.locator('#enquiry-topic').select_option(label='Collaboration idea')
        page.locator('#enquiry-message').fill(message)
        page.locator('#enquiry-consent').check()
        with page.expect_navigation(url=endpoint):
            send.click()
        assert page.get_by_role('heading', name='Message received').is_visible()
        assert len(submissions) == attempt + 1
        method, fields = submissions[attempt]
        assert method == 'POST'
        subject, = fields.pop('_subject')
        assert re.fullmatch(r'Cellar Studio \| Collaboration idea \| #[0-9A-F]{16}', subject)
        subjects.add(subject)
        assert fields == {
            '_url': ['https://cellar-csv.vercel.app/contact.html'],
            'name': ['Sample Visitor'],
            'email': ['visitor+test@example.com'],
            'topic': ['Collaboration idea'],
            'message': [message.replace('\n', '\r\n')],
        }
    assert len(subjects) == 2, 'Identical enquiries must still use different email subjects.'

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

    # Check uploaded and pasted exports using the production worker policy.
    page.route(BASE + 'guard-app.html', serve_contact_with_policy)
    for width in (390, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        page.goto(BASE + 'guard-app.html')
        page.get_by_role('button', name='Load breaking example').click()
        page.get_by_text('Example loaded. Select Check export.', exact=True).wait_for()
        check = page.get_by_role('button', name='Check export')
        check.click()
        page.get_by_role('heading', name='Release blocked').wait_for()
        assert page.get_by_text('MISSING_COLUMN', exact=True).is_visible()
        assert page.get_by_text('order_id · record 1', exact=True).is_visible()

        page.locator('#csv-file').set_input_files({
            'name': 'valid.csv', 'mimeType': 'text/csv',
            'buffer': b'order_id,sku,total_cents,currency\nPRIVATE-TEST-ORDER,SKU1,100,INR\n',
        })
        check.click()
        page.get_by_role('heading', name='Ready to ship').wait_for()
        with page.expect_download() as saved:
            page.get_by_role('button', name='Download report').click()
        report_text = saved.value.path().read_text()
        assert json.loads(report_text)['passed'] is True
        assert 'PRIVATE-TEST-ORDER' not in report_text

        page.get_by_role('button', name='Switch to dark mode').click()
        assert page.locator('html').get_attribute('data-theme') == 'dark'
        assert page.evaluate('document.documentElement.scrollWidth - innerWidth') <= 1
        page.get_by_role('button', name='Switch to light mode').click()

    assert not errors, errors
    print(f'Checked {len(ROUTES)} routes at four widths, privacy choices, enquiry validation and mobile menu.')
    browser.close()
