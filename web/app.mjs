import {compare,convertInputs,readScenario,csvCell} from './model.mjs';
const $=id=>document.getElementById(id), key='coolcode:budgetmirror:scenario';
let data,profile,inputs={},period='monthly',result;
const money=n=>n==null?'Unavailable':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n);
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function optionList(id,values,preferred){const select=$(id),old=preferred??select.value;select.replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=value;o.textContent=value;return o;}));if(values.includes(old))select.value=old;}
function selectProfile(preferred={}){
 const profiles=data.profiles.filter(p=>p.mode===$('mode').value);
 optionList('year',[...new Set(profiles.map(p=>p.year))].sort().reverse(),preferred.year);
 const years=profiles.filter(p=>p.year===$('year').value);
 optionList('geography',[...new Set(years.map(p=>p.geography))].sort(),preferred.geography??($('geography').value||'Canada'));
 const geos=years.filter(p=>p.geography===$('geography').value);
 optionList('group',[...new Set(geos.map(p=>p.group))].sort(),preferred.group);
 profile=geos.find(p=>p.group===$('group').value);
 if(!profile)throw new Error('No published comparison matches this selection.');
 $('coverage').textContent=`${profile.year} annual household expenditure · ${profile.geography} · ${profile.group}. Table ${profile.table.slice(0,2)}-${profile.table.slice(2,4)}-${profile.table.slice(4)}-01.`;
 drawRows();calculate();
}
function drawRows(){
 $('spending').replaceChildren(...data.categories.map(category=>{
 const row=document.createElement('tr'),label=document.createElement('td'),inputCell=document.createElement('td');
 const name=document.createElement('strong');name.textContent=category.label;label.append(name);
 const details=document.createElement('details'),summary=document.createElement('summary'),hint=document.createElement('p');summary.textContent='What to include';summary.className='hint';hint.className='hint';hint.textContent=category.hint;details.append(summary,hint);label.append(details);
 const input=document.createElement('input');input.type='number';input.min='0';input.max='5000000';input.step='0.01';input.inputMode='decimal';input.id='amount-'+category.id;input.setAttribute('aria-label',category.label+' spending');input.value=inputs[category.id]??'';input.addEventListener('input',()=>{inputs[category.id]=input.value;calculate();});inputCell.append(input);
 const ref=document.createElement('td'),diff=document.createElement('td');ref.className=diff.className='number';ref.id='ref-'+category.id;diff.id='diff-'+category.id;row.append(label,inputCell,ref,diff);return row;
 }));
}
function calculate(){
 try{result=compare(data.categories,inputs,profile,period);
 for(const r of result.rows){$('ref-'+r.id).textContent=money(r.reference)+(r.status?' '+r.status:'');$('diff-'+r.id).textContent=r.difference==null?'—':money(r.difference);}
 $('your-total').textContent=result.count?money(result.yours):'—';$('reference-total').textContent=result.count?money(result.benchmark):'—';$('difference').textContent=result.count?money(result.difference):'—';$('matched').textContent=`${result.count} matched ${result.count===1?'category':'categories'} · ${period}`;
 $('difference-note').textContent=result.count?(result.difference>0?'Above the selected average':result.difference<0?'Below the selected average':'Matches the selected average'):'Your amount minus the average';
 const rows=result.rows.filter(r=>r.input!=null&&r.reference!=null),max=Math.max(1,...rows.flatMap(r=>[r.input,r.reference]));
 $('chart').replaceChildren(...rows.map(r=>{const row=document.createElement('div');row.className='bar-row';const label=document.createElement('span');label.textContent=r.label;const bars=document.createElement('div');for(const [n,cls,kind] of [[r.input,'you','Yours'],[r.reference,'','Average']]){const track=document.createElement('span');track.className='bar-track';track.title=kind+': '+money(n);const fill=document.createElement('span');fill.className='bar-fill '+cls;fill.style.width=(100*n/max)+'%';track.append(fill);bars.append(track);}row.append(label,bars);return row;}));
 status(`${profile.year} survey data ready. Your entries stay on this device.${result.entered>result.count?' Some entered categories have no publishable reference estimate.':''}`);
 }catch(error){result=null;status(error.message,true);for(const id of ['your-total','reference-total','difference'])$(id).textContent='—';$('chart').replaceChildren();}
}
function scenario(){if(!result)throw new Error('Correct invalid amounts before saving.');return {schema_version:1,tool:'budgetmirror',period,mode:$('mode').value,year:profile.year,geography:profile.geography,group:profile.group,inputs};}
function restore(value){const s=readScenario(value,data.categories.map(c=>c.id));if(!data.profiles.some(p=>p.mode===s.mode&&p.year===s.year&&p.geography===s.geography&&p.group===s.group))throw new Error('This scenario references a group absent from this snapshot. Amounts have not been changed.');inputs=s.inputs;period=s.period;$('period').value=period;$('mode').value=s.mode;selectProfile(s);}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function action(id,fn){$(id).addEventListener('click',()=>{try{fn();}catch(e){$('save-status').textContent=e.message;}});}
async function start(){
 try{const response=await fetch('./data/spending.json');if(!response.ok)throw new Error('The public snapshot could not be loaded. Please reload.');data=await response.json();if(!data.profiles?.length)throw new Error('No validated source profiles are available.');
 $('source-date').textContent=`Source checked ${new Date(data.checked_at).toLocaleString()}. Reference years are selected above; the check date is not a new survey year.`;
 $('sources').replaceChildren(...data.sources.map(s=>{const li=document.createElement('li'),a=document.createElement('a');a.href=s.url;a.textContent=`Statistics Canada ${s.table} · ${s.reference_years[0]}–${s.reference_years.at(-1)}`;li.append(a);return li;}));
 selectProfile({geography:'Canada'});
 for(const id of ['mode','year','geography','group'])$(id).addEventListener('change',()=>{try{selectProfile();}catch(e){status(e.message,true);}});
 $('period').addEventListener('change',()=>{try{inputs=convertInputs(inputs,period,$('period').value);period=$('period').value;drawRows();calculate();}catch(e){$('period').value=period;status(e.message,true);}});
 action('save',()=>{localStorage.setItem(key,JSON.stringify(scenario()));$('save-status').textContent='Saved on this browser only.';});
 action('load',()=>{const saved=localStorage.getItem(key);if(!saved)throw new Error('No saved scenario on this browser.');restore(JSON.parse(saved));$('save-status').textContent='Saved scenario loaded.';});
 action('forget',()=>{localStorage.removeItem(key);$('save-status').textContent='Saved scenario deleted. Current entries remain until cleared or the page closes.';});
 action('clear',()=>{inputs={};drawRows();calculate();$('save-status').textContent='Current amounts cleared. Use Delete saved to remove a stored scenario.';});
 action('export',()=>download(JSON.stringify(scenario(),null,2),'budgetmirror-scenario.json','application/json'));
 action('import',()=>$('file').click());$('file').addEventListener('change',async()=>{try{const file=$('file').files[0];if(!file)return;if(file.size>100000)throw new Error('Scenario files must be smaller than 100 KB.');restore(JSON.parse(await file.text()));$('save-status').textContent='Imported locally. Nothing saved automatically.';}catch(e){$('save-status').textContent=e.message;}finally{$('file').value='';}});
 action('csv',()=>{if(!result)throw new Error('Correct the amounts first.');const rows=[['Category','Your '+period+' CAD','Reference '+period+' CAD','Difference CAD','Source year','Geography','Group','Quality flag'],...result.rows.map(r=>[r.label,r.input,r.reference==null?'':r.reference.toFixed(2),r.difference==null?'':r.difference.toFixed(2),profile.year,profile.geography,profile.group,r.status])];download(rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'budgetmirror-comparison.csv','text/csv');});
 action('print',()=>window.print());
 }catch(e){status(e.message,true);}
}
start();
