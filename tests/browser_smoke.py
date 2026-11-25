"""Exercise the actual application at a project subpath in Chromium (CI)."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil,tempfile,threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass

def main():
 screenshots=ROOT/'browser-checks';screenshots.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory() as temporary:
  shutil.copytree(ROOT/'dist',Path(temporary)/'example-tool')
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=temporary))
  threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   with sync_playwright() as p:
    browser=p.chromium.launch();page=browser.new_page(viewport={'width':1280,'height':1000})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/assets/tool-metrics.js',lambda route:route.fulfill(status=200,body=''))
    page.goto(f'http://127.0.0.1:{server.server_port}/example-tool/')
    page.locator('#amount-food').wait_for()
    page.locator('#amount-food').fill('1000')
    assert '$1,000' in page.locator('#your-total').inner_text()
    assert '1 matched category' in page.locator('#matched').inner_text()
    page.locator('#period').select_option('annual')
    assert float(page.locator('#amount-food').input_value())==12000
    page.locator('#period').select_option('monthly')
    page.locator('#mode').select_option('household')
    assert page.locator('#geography option').count()==1
    assert page.locator('#geography').input_value()=='Canada'
    page.locator('#save').click();page.locator('#clear').click()
    assert page.locator('#amount-food').input_value()==''
    page.locator('#load').click();assert float(page.locator('#amount-food').input_value())==1000
    with page.expect_download() as download:page.locator('#csv').click()
    assert download.value.suggested_filename=='budgetmirror-comparison.csv'
    page.locator('#amount-food').fill('-1');assert 'between' in page.locator('#status').inner_text()
    page.locator('#amount-food').fill('1000')
    page.locator('#forget').click();assert 'deleted' in page.locator('#save-status').inner_text()
    page.reload();page.locator('#amount-food').wait_for();assert page.locator('#amount-food').input_value()==''
    page.locator('#amount-food').fill('1000')
    page.screenshot(path=str(screenshots/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(screenshots/'mobile.png'),full_page=True)
    assert not errors,errors
    browser.close()
   print('Browser flow, safe rendering, storage and mobile layout passed')
  finally:server.shutdown()
if __name__=='__main__':main()
