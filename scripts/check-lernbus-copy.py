"""Compare all published wording against the live-site snapshot. Calendar is the sole text addition."""
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
for path,source in base['pages'].items():
 p=VisibleText();p.feed((Path('_site')/path).read_text())
 expected=tokens(source['body_text']);actual=tokens(' '.join(p.parts))
 if actual!=expected:
  changes='\n'.join(difflib.unified_diff(expected,actual,fromfile='live source',tofile=path,n=4))
  raise AssertionError(f'{path}: published wording changed\n{changes[:3500]}')
 print(path+': exact live wording retained')
print('All 6 routes match the live-site text; only the calendar addition is excluded.')
