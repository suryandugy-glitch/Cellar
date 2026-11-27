from playwright.sync_api import sync_playwright
from pathlib import Path
import os
url='http://127.0.0.1:8186/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ['CHROME_BIN'],args=['--no-sandbox'])
 page=b.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 routes=['index','explore','services','downloads','spacefix-downloads','handbook']+[f.stem for f in Path('build/vercel').glob('*-downloads.html')]+[f.stem for f in Path('build/vercel').glob('product-*.html')]+[f.stem for f in Path('build/vercel').glob('service-*.html')]
 for w in [320,390,768,1440]:
  page.set_viewport_size({'width':w,'height':900})
  for route in routes:
   resp=page.goto(url+route+'.html')
   assert resp.status==200 and page.locator('h1').count()==1,route
   overflow=page.evaluate('document.documentElement.scrollWidth-innerWidth')
   assert overflow<=1, (w,route,overflow)
 page.goto(url+'explore.html')
 page.get_by_role('button',name='Pilot',exact=True).click()
 assert page.locator('.product-card:visible').count()==2
 page.get_by_role('searchbox').fill('spacefix')
 page.locator('.product-card:visible').click()
 page.get_by_role('link',name='SpaceFix downloads').click()
 assert 'v1.0.1/SpaceFix.exe' in page.get_by_role('link',name='Download SpaceFix.exe').get_attribute('href')
 page.goto(url+'explore.html#crashcheck');page.wait_for_url('**/product-crashcheck.html')
 page.goto(url+'explore.html#docs');page.wait_for_url('**/handbook.html#docs')

 print('Checked',len(routes),'routes at four widths; JS errors',errors);assert not errors
