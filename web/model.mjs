export function amount(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('Enter a number or leave the amount blank.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 5_000_000) throw new Error('Amounts must be between $0 and $5,000,000.');
  return n;
}
export function compare(categories, inputs, profile, period = 'monthly') {
  if (!['monthly', 'annual'].includes(period)) throw new Error('Choose monthly or annual amounts.');
  const factor = period === 'monthly' ? 12 : 1;
  const rows = categories.map(c => {
    const input = amount(inputs[c.id]);
    const stored = profile.values[c.id];
    const annual = stored?.annual ?? null;
    const reference = annual == null ? null : annual / factor;
    const matched = input != null && reference != null;
    return {...c, input, reference, status: stored?.status || '', difference: matched ? input - reference : null,
      percent: matched && reference > 0 ? (input / reference - 1) * 100 : null};
  });
  const matched = rows.filter(r => r.input != null && r.reference != null);
  const yours = matched.reduce((sum,r) => sum+r.input,0), benchmark = matched.reduce((sum,r) => sum+r.reference,0);
  return {rows,yours,benchmark,difference:yours-benchmark,count:matched.length,entered:rows.filter(r=>r.input!=null).length};
}
export function convertInputs(inputs, from, to) {
  if (!['monthly','annual'].includes(from) || !['monthly','annual'].includes(to)) throw new Error('Invalid period.');
  const factor=from===to?1:from==='monthly'?12:1/12;
  return Object.fromEntries(Object.entries(inputs).map(([key,val])=>[key,amount(val)==null?'':Math.round(amount(val)*factor*100)/100]));
}
export function readScenario(value, categoryIds) {
  if (!value || value.schema_version!==1 || value.tool!=='budgetmirror' || !value.inputs || typeof value.inputs!=='object' || Array.isArray(value.inputs)) throw new Error('This is not a Budget Mirror scenario.');
  if (!['monthly','annual'].includes(value.period)) throw new Error('Invalid scenario period.');
  const inputs={};for(const id of categoryIds) {const n=amount(value.inputs[id]); inputs[id]=n==null?'':n;}
  return {...value,inputs};
}
export function csvCell(value) {return '"'+(typeof value==='string' && /^[=+\-@]/.test(value) ? "'"+value : String(value??'')).replaceAll('"','""')+'"';}
