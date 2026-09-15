const ZONE='Europe/Zurich',DAY=86400000;
const copy={
 de:{loading:'Freie Termine werden geladen …',empty:'In diesem Monat sind keine freien Termine verfügbar. Wählen Sie einen anderen Monat oder schreiben Sie uns.',unavailable:'Die Verfügbarkeit ist gerade nicht erreichbar. Bitte versuchen Sie es erneut oder schreiben Sie uns.',choose:'Uhrzeit auswählen',none:'Wählen Sie einen verfügbaren Tag.',unavailableDay:'nicht verfügbar',selection:'Ihr Termin',sending:'Termin wird reserviert …',invalid:'Bitte wählen Sie Datum und Uhrzeit und geben Sie Ihren Namen und Ihre E-Mail-Adresse ein.',expired:'Die Verfügbarkeit hat sich geändert. Bitte wählen Sie einen freien Termin aus.',pending:'Die Reservierung wird noch bestätigt. Bitte reservieren Sie keinen weiteren Termin. Prüfen Sie den Status hier erneut.',confirmed:label=>`Ihr Termin am ${label} ist reserviert. Wir kontaktieren Sie für ein Kennenlerngespräch.`,failed:'Der Termin wurde nicht reserviert. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut.',cancelled:'Diese Reservierung wurde storniert. Für einen neuen Termin kontaktieren Sie uns bitte.',rate:'Bitte warten Sie einige Minuten und versuchen Sie es erneut.',submit:'Termin reservieren',name:'Bitte geben Sie Ihren Namen ein.'},
 en:{loading:'Loading available times…',empty:'There are no available times this month. Please choose another month or email us.',unavailable:'Availability is temporarily unavailable. Please try again or email us.',choose:'Choose a time',none:'Choose an available day.',unavailableDay:'unavailable',selection:'Your time',sending:'Reserving your time…',invalid:'Please choose a date and time and enter your name and email address.',expired:'Availability has changed. Please choose an available time.',pending:'Your reservation is still being confirmed. Please do not make another reservation. Check its status here again.',confirmed:label=>`Your time on ${label} is reserved. We will contact you to arrange an introductory meeting.`,failed:'Your time was not reserved. Your entries are still in the form. Please try again.',cancelled:'This reservation has been cancelled. Please contact us to arrange a new time.',rate:'Please wait a few minutes before trying again.',submit:'Reserve this time',name:'Please enter your name.'}
};
const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const dateEpoch=date=>Date.parse(date+'T12:00:00Z');
const dateISO=value=>new Date(value).toISOString().slice(0,10);
function monthShift(month,n){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return dateISO(d).slice(0,7);}
export function calendarKeyDate(date,key,shift=false){
 const d=dateEpoch(date),index=(new Date(d).getUTCDay()+6)%7,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-index,End:6-index};
 if(key in delta)return dateISO(d+delta[key]*DAY);
 if(key==='PageUp'||key==='PageDown'){const month=monthShift(date.slice(0,7),(key==='PageUp'?-1:1)*(shift?12:1));const last=new Date(Date.parse(monthShift(month,1)+'-01T12:00:00Z')-DAY).getUTCDate();return month+'-'+String(Math.min(+date.slice(8),last)).padStart(2,'0');}return null;
}
export function validSlots(data){
 return data?.schemaVersion===1&&data.timeZone===ZONE&&data.durationMinutes===60&&/^\d{4}-\d{2}$/.test(data.month)&&data.month>=data.minMonth&&data.month<=data.maxMonth&&Array.isArray(data.slots)&&data.slots.length<1000&&data.slots.every(s=>typeof s.slotToken==='string'&&Number.isFinite(Date.parse(s.start))&&Date.parse(s.end)-Date.parse(s.start)===3600000&&day(s.start).slice(0,7)===data.month);
}
export async function apiFetch(api,path,options={}){
 const response=await fetch(api+path,{...options,credentials:'omit',cache:'no-store',signal:options.signal||AbortSignal.timeout(45000),headers:{...options.headers}});
 const data=await response.json();return {ok:response.ok,status:response.status,data};
}
export function mountCalendar(root,{api=root.dataset.api,fetcher=apiFetch}={}){
 if(root.dataset.requestMounted)return;root.dataset.requestMounted='true';
 const locale=root.dataset.locale==='en'?'en':'de',t=copy[locale],lang=locale==='en'?'en-GB':'de-CH';
 const q=selector=>root.querySelector(selector),form=q('[data-request-form]'),controls=q('[data-request-controls]'),status=q('[data-request-status]'),loadStatus=q('[data-calendar-load-status]'),reload=q('[data-calendar-reload]'),recover=q('[data-booking-recover]'),grid=q('[data-request-grid]'),times=q('[data-request-times]'),monthTitle=q('[data-request-month]'),summary=q('[data-request-summary]'),previous=q('[data-request-previous]'),next=q('[data-request-next]'),submit=form.querySelector('[type=submit]');
 const fmt=(value,options)=>new Intl.DateTimeFormat(lang,{timeZone:ZONE,...options}).format(new Date(value));
 const fullDate=value=>fmt(value,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const time=value=>fmt(value,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const range=s=>time(s.start)+'–'+time(s.end);
 const label=s=>fullDate(s.start)+', '+range(s);
 const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 let data=null,selectedDate='',selected=null,focused='',generation=0,controller,operation=null,sending=false,done=false;
 const storageKey='lernbus.reservation.v1';
 const save=()=>{try{operation?sessionStorage.setItem(storageKey,JSON.stringify(operation)):sessionStorage.removeItem(storageKey);}catch{}};
 const announce=(message,state='pending',focus=false)=>{status.textContent=message;status.dataset.state=state;if(focus)status.focus();};
 const daysSlots=date=>(data?.slots||[]).filter(s=>day(s.start)===date);
 function renderTimes(){
  q('[data-request-time-title]').textContent=selectedDate?`${t.choose} · ${fmt(dateEpoch(selectedDate),{day:'numeric',month:'long'})}`:t.none;
  times.replaceChildren();
  for(const s of daysSlots(selectedDate)){
   const input=el('input','',{type:'radio',name:'lesson_time',value:s.start,required:''}),item=el('label','',{class:'lesson-request__time'});
   input.checked=selected?.start===s.start;
   input.addEventListener('change',()=>{selected=s;summary.textContent=t.selection+': '+label(s);});
   item.append(input,el('span',range(s)));times.append(item);
  }
  if(!selected)summary.textContent='';
 }
 function renderGrid(focus=false){
  if(!data)return;
  monthTitle.textContent=fmt(dateEpoch(data.month+'-01'),{month:'long',year:'numeric'});previous.disabled=data.month<=data.minMonth;next.disabled=data.month>=data.maxMonth;
  grid.replaceChildren();const header=el('div','',{role:'row',class:'lesson-request__week'});
  for(let i=0;i<7;i++)header.append(el('span',fmt(Date.UTC(2026,0,5+i,12),{weekday:'short'}),{role:'columnheader','aria-label':fmt(Date.UTC(2026,0,5+i,12),{weekday:'long'})}));
  grid.append(header);
  const first=dateEpoch(data.month+'-01'),start=first-((new Date(first).getUTCDay()+6)%7)*DAY,last=dateEpoch(monthShift(data.month,1)+'-01')-DAY;
  for(let week=start;week<=last;week+=7*DAY){
   const row=el('div','',{role:'row',class:'lesson-request__week'});
   for(let i=0;i<7;i++){
    const date=dateISO(week+i*DAY),cell=el('div','',{role:'gridcell','aria-selected':date===selectedDate});
    if(date.slice(0,7)===data.month){const available=daysSlots(date).length>0;const button=el('button',String(+date.slice(8)),{type:'button','data-request-date':date,tabindex:date===focused?0:-1,'aria-disabled':!available,'aria-label':fullDate(dateEpoch(date))+(available?'':', '+t.unavailableDay)});if(date===day(Date.now()))button.setAttribute('aria-current','date');cell.append(button);}
    row.append(cell);
   }grid.append(row);
  }
  if(focus)grid.querySelector(`[data-request-date="${focused}"]`)?.focus();
 }
 async function load(month,focusDate){
  if(operation||done)return;
  const sequence=++generation;controller?.abort();controller=new AbortController();
  controls.disabled=true;grid.setAttribute('aria-busy','true');loadStatus.textContent=t.loading;reload.hidden=true;
  const timeout=setTimeout(()=>controller.abort(),45000);
  try{
   const r=await fetcher(api,'/api/lesson-slots?locale='+locale+(month?'&month='+month:''),{signal:controller.signal});
   if(sequence!==generation)return;
   if(!r.ok||!validSlots(r.data))throw new Error();
   data=r.data;selected=null;selectedDate=data.slots[0]?day(data.slots[0].start):'';focused=focusDate||selectedDate||data.month+'-01';
   loadStatus.textContent=data.slots.length?'':t.empty;controls.disabled=false;renderGrid(Boolean(focusDate));renderTimes();
  }catch{if(sequence!==generation)return;loadStatus.textContent=t.unavailable;reload.hidden=false;}
  finally{clearTimeout(timeout);if(sequence===generation)grid.removeAttribute('aria-busy');}
 }
 async function complete(result){
  const r=result.data;
  if(r?.schemaVersion!==1||r.operationId!==operation.id||!['confirmed','pending','failed','cancelled'].includes(r.status))throw new Error('uncertain');
  if(r.status==='confirmed'){
   if(![200,201].includes(result.status)||r.start!==operation.start||r.end!==operation.end)throw new Error('uncertain');
   done=true;controls.hidden=true;recover.hidden=true;announce(t.confirmed(label(r)),'success',true);operation=null;save();return;
  }
  if(r.status==='failed'){
   operation=null;save();controls.hidden=false;recover.hidden=true;await load(data?.month);announce(t.failed,'error',true);return;
  }
  if(r.status==='cancelled'){done=true;controls.hidden=true;recover.hidden=true;announce(t.cancelled,'error',true);operation=null;save();return;}
  if(typeof r.statusToken!=='string')throw new Error('uncertain');
  operation.statusToken=r.statusToken;save();announce(t.pending,'pending',true);recover.hidden=false;
 }
 async function send(){
  if(sending||!operation)return;sending=true;controls.disabled=true;recover.disabled=true;form.setAttribute('aria-busy','true');submit.textContent=t.sending;
  try{
   const r=operation.statusToken?await fetcher(api,'/api/lesson-reservations/'+operation.id,{headers:{Authorization:'Bearer '+operation.statusToken}}):await fetcher(api,'/api/lesson-reservations',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':operation.id},body:JSON.stringify(operation.payload)});
   if(r.ok){await complete(r);}
   else if(!operation.statusToken&&[409,422,429].includes(r.status)&&r.data?.error!=='IDEMPOTENCY_MISMATCH'){
    const message=r.status===429?t.rate:r.status===422?t.invalid:t.expired;operation=null;save();selected=null;recover.hidden=true;await load(data?.month);announce(message,'error',true);
   }else{announce(t.pending,'pending',true);recover.hidden=false;}
  }catch{announce(t.pending,'pending',true);recover.hidden=false;}
  finally{sending=false;recover.disabled=false;form.removeAttribute('aria-busy');submit.textContent=t.submit;}
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();if(operation||sending||done)return;
  const name=form.elements.namedItem('name');name.setCustomValidity(name.value.trim()?'':t.name);
  if(!form.reportValidity())return;
  if(!selected){announce(t.invalid,'error',true);return;}
  operation={id:crypto.randomUUID(),start:selected.start,end:selected.end,payload:{locale,slotToken:selected.slotToken,parent:{name:name.value.trim(),email:form.elements.namedItem('email').value.trim()},notes:form.elements.namedItem('notes').value.trim(),website:form.elements.namedItem('website')?.value||''}};
  save();send();
 });
 form.elements.namedItem('name').addEventListener('input',event=>event.target.setCustomValidity(''));
 recover.addEventListener('click',send);reload.addEventListener('click',()=>load(data?.month));
 previous.addEventListener('click',()=>{const month=monthShift(data.month,-1);load(month,month+'-01');});next.addEventListener('click',()=>{const month=monthShift(data.month,1);load(month,month+'-01');});
 grid.addEventListener('focusin',event=>{const b=event.target.closest('[data-request-date]');if(b){focused=b.dataset.requestDate;grid.querySelectorAll('[data-request-date]').forEach(x=>x.tabIndex=x===b?0:-1);}});
 grid.addEventListener('click',event=>{const b=event.target.closest('[data-request-date]');if(!b||controls.disabled||b.getAttribute('aria-disabled')==='true')return;selectedDate=focused=b.dataset.requestDate;selected=null;renderGrid(true);renderTimes();});
 grid.addEventListener('keydown',event=>{const b=event.target.closest('[data-request-date]');if(!b||controls.disabled)return;const target=calendarKeyDate(b.dataset.requestDate,event.key,event.shiftKey);if(!target)return;event.preventDefault();if(target.slice(0,7)<data.minMonth||target.slice(0,7)>data.maxMonth)return;if(target.slice(0,7)!==data.month)load(target.slice(0,7),target);else{focused=target;renderGrid(true);}});
 q('[data-request-ui]').hidden=false;q('[data-request-fallback]').hidden=true;
 try{const stored=JSON.parse(sessionStorage.getItem(storageKey));if(stored?.id&&stored.payload&&stored.start&&stored.end){
  operation=stored;
  for(const [name,value]of Object.entries({name:stored.payload.parent?.name,email:stored.payload.parent?.email,notes:stored.payload.notes}))if(typeof value==='string')form.elements.namedItem(name).value=value;
 }}catch{}
 if(operation){controls.disabled=true;controls.hidden=true;announce(t.pending+' '+t.selection+': '+label(operation));recover.hidden=false;}else load();
 return {reload:()=>load(data?.month)};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('[data-lesson-request]');
 if(root){
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();mountCalendar(root);}},{rootMargin:'400px'});observer.observe(root);}
  else mountCalendar(root);
 }
}
