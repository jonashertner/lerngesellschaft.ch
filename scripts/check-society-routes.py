"""Check the bilingual association and essay journeys in a clean Eleventy build."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
import json
import re
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()
origin = 'https://lerngesellschaft.ch'
archive = '/essays/relational-learning/'


class Page(HTMLParser):
    def __init__(self, route):
        super().__init__()
        self.route = route
        self.ids, self.references, self.alternates = set(), [], {}
        self.canonical, self.robots, self.refresh = None, '', None
        path = resolve(route)
        self.html = path.read_text()
        self.feed(self.html)

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            assert data['id'] not in self.ids, (self.route, 'duplicate id', data['id'])
            self.ids.add(data['id'])
        for attribute in ('href', 'src'):
            if data.get(attribute):
                self.references.append(data[attribute])
        if tag == 'link' and data.get('rel') == 'canonical':
            assert self.canonical is None, (self.route, 'duplicate canonical')
            self.canonical = data['href']
        if tag == 'link' and data.get('hreflang'):
            self.alternates[data['hreflang']] = data['href']
        if tag == 'meta':
            if data.get('name') == 'robots':
                self.robots = data.get('content', '')
            if data.get('http-equiv', '').lower() == 'refresh':
                self.refresh = data.get('content', '')


def resolve(route):
    path = root / unquote(urlsplit(route).path).lstrip('/')
    if path.is_dir():
        path /= 'index.html'
    assert path.is_file(), ('missing output', route)
    return path


pairs = [('/', '/en/'), ('/ansatz/', '/en/approach/'),
         ('/impressum/', '/imprint/'),
         ('/forscherbuehne/', '/en/forscherbuehne/'),
         ('/gehirn-und-gesellschaft/', '/en/brain-and-society/'),
         (archive + 'de/', archive + 'en/')]
routes = {route for pair in pairs for route in pair}
routes.update(['/lernbus/', '/lernbus/en/', '/lernbus/konzept/',
               '/lernbus/en/konzept/', '/lernbus/team/', '/lernbus/team/en/'])
pages = {route: Page(route) for route in sorted(routes)}
for de, en in pairs:
    for route in (de, en):
        page = pages[route]
        assert page.canonical == origin + route, (route, 'canonical')
        assert page.alternates == {'de': origin + de, 'en': origin + en,
                                   'x-default': origin + de}, (route, 'alternates')
        if route in ('/', '/en/', '/ansatz/', '/en/approach/', '/impressum/', '/imprint/'):
            assert 'noindex' not in page.robots, (route, 'public page noindex')
        else:
            assert 'noindex' in page.robots, (route, 'preserve draft/archive status')

assert 'Basel' in pages['/en/'].html
assert 'investieren' in pages['/en/'].ids
assert 'A manifesto for relational learning' not in pages['/en/'].html
checked = 0
for route, page in pages.items():
    for reference in page.references:
        url = urlsplit(urljoin(origin + route, reference))
        if url.scheme not in ('http', 'https') or url.netloc != 'lerngesellschaft.ch':
            continue
        target = resolve(url.path)
        if url.fragment:
            # Existing print-only footnote backlinks are unrelated to route migration.
            if re.fullmatch(r'fnref\d+', url.fragment):
                continue
            html = target.read_text()
            assert f'id="{url.fragment}"' in html, (route, 'missing anchor', reference)
        assert '/vorschau/en/' not in reference, (route, 'still links to preview', reference)
        checked += 1

redirects = {'/vorschau/en/': '/en/',
             '/vorschau/en/unser-ansatz.html': '/en/approach/',
             '/vorschau/en/forscherbuehne.html': '/en/forscherbuehne/',
             '/vorschau/en/gehirn-und-gesellschaft.html': '/en/brain-and-society/',
             '/de/': archive + 'de/'}
for lang in ('de', 'en'):
    redirects[f'/{lang}/print/'] = archive + lang + '/print/'
    old = resolve(f'/{lang}/paper.md').read_text()
    current = resolve(archive + lang + '/paper.md').read_text()
    assert old == current, (lang, 'raw Markdown alias differs')
    assert '<!doctype' not in old.lower(), (lang, 'raw alias became HTML')
    assert 'https://learningsociety.ch' not in old, (lang, 'old domain in raw edition')
    printed = Page(archive + lang + '/print/')
    assert printed.canonical == origin + archive + lang + '/print/'
    assert f'href="{archive}{lang}/"' in printed.html, (lang, 'print returns to homepage')
for route, target in redirects.items():
    page = Page(route)
    assert page.canonical == origin + target, (route, 'redirect canonical')
    assert page.refresh == '0; url=' + target, (route, 'redirect fallback')
    assert 'location.search + location.hash' in page.html, (route, 'lost query/fragment')
    resolve(target)

sitemap = ET.fromstring((root / 'sitemap.xml').read_text())
listed = [item.text for item in sitemap.findall('.//{*}loc')]
assert origin + '/en/' in listed and origin + '/en/approach/' in listed
for location in listed:
    page = Page(urlsplit(location).path)
    assert 'noindex' not in page.robots and page.refresh is None, ('nonpublic sitemap entry', location)
    assert page.canonical == location, ('sitemap differs from canonical', location)

print(json.dumps({'pages': len(pages), 'local_references': checked,
                  'redirects': len(redirects), 'sitemap_entries': len(listed),
                  'result': 'passed'}))
