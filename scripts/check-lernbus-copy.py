"""Compare all published wording against the live-site snapshot. Only explicitly authorized text changes are allowed."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,difflib
class VisibleText(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.parts=[];self.in_body=False
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='body':self.in_body=True
  ignored=tag in ('script','style') or 'data-booking-addition' in attrs or (self.stack and self.stack[-1][1])
  if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append((tag,bool(ignored)))
 def handle_endtag(self,tag):
  if tag=='body':self.in_body=False
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
 def handle_data(self,text):
  if self.in_body and not(self.stack and self.stack[-1][1]):self.parts.append(text)
def tokens(s):return re.findall(r'\w+|[^\w\s]',s)
base=json.loads(Path('design/lernbus-live-copy.json').read_text())
authorized=json.loads(Path('design/lernbus-authorized-copy.json').read_text())
for path,source in base['pages'].items():
 p=VisibleText();p.feed((Path('_site')/path).read_text())
 expected=tokens(source['body_text']);actual=tokens(' '.join(p.parts))
 # Keep the live baseline immutable; apply only the separately documented user changes.
 for edit in reversed(authorized['pages'].get(path,[])):
  start,end=edit['start'],edit['end']
  assert expected[start:end]==tokens(edit['before']), f'{path}: authorized change no longer matches source'
  expected[start:end]=tokens(edit['after'])
 if actual!=expected:
  changes='\n'.join(difflib.unified_diff(expected,actual,fromfile='live source',tofile=path,n=4))
  raise AssertionError(f'{path}: published wording changed\n{changes[:3500]}')
 print(path+': original wording and authorized changes verified')
print('All 6 routes match the preserved source wording and explicitly authorised revisions.')
