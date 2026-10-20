import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { read, apply, screenSpec } from '../skills/glyph-kit/scripts/say.mjs';
import { body } from '../skills/glyph-kit/scripts/render/text.mjs';

const folder = new URL('../tests/fixtures/say/sessions/', import.meta.url);
const p95 = (values) => [...values].sort((a,b)=>a-b)[Math.ceil(values.length * .95)-1] ?? 0;
export function replay(session) {
  let committed = {kind:'screen',data:{title:'',rows:[]}};
  const finals = new Set(), samples = [];
  let committedMutations = 0, draftAppearances = 0, draftDisappearances = 0, previousDraft = new Set();
  for (const segment of session.segments) {
    if (segment.final && finals.has(segment.id)) continue;
    const before = JSON.stringify(committed), start = performance.now();
    const changes = read(segment.text, committed), parsed = performance.now();
    const preview = apply(committed,changes);
    const lines = body(screenSpec(preview)), drawn = performance.now();
    if (!segment.final && JSON.stringify(committed)!==before) committedMutations++;
    if(segment.final){committed=preview;finals.add(segment.id);}
    const baseRows = [...committed.data.rows,...committed.data.overlay?.rows??[]];
    const draft = new Set(segment.final ? [] : [...preview.data.rows,...preview.data.overlay?.rows??[]]
      .filter(row=>JSON.stringify(row)!==JSON.stringify(baseRows.find(base=>base.id===row.id))).map(row=>row.id));
    for(const id of draft)if(!previousDraft.has(id))draftAppearances++;
    for(const id of previousDraft)if(!draft.has(id))draftDisappearances++;
    previousDraft=draft;
    samples.push({id:segment.id,final:segment.final,readMs:parsed-start,applyAndDrawMs:drawn-parsed,totalMs:drawn-start,lineCount:lines.split('\n').length});
  }
  return {name:session.name,provenance:session.provenance,committedMutations,draftAppearances,draftDisappearances,
    readP95Ms:p95(samples.map(s=>s.readMs)),applyAndDrawP95Ms:p95(samples.map(s=>s.applyAndDrawMs)),totalP95Ms:p95(samples.map(s=>s.totalMs)),
    expectedTypes:session.expectedTypes,actualTypes:committed.data.rows.map(row=>row.type),finalSpec:screenSpec(committed),samples};
}
export function replayAll(){
  return readdirSync(folder).filter(name=>name.endsWith('.json')).sort().map(name=>replay(JSON.parse(readFileSync(new URL(name,folder)))));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const results=replayAll();
  const report={recordedAt:new Date().toISOString(),runtime:process.version,platform:process.platform,arch:process.arch,
    note:'Synthetic segment streams, run without wall-clock delays. Node timings exclude microphone, browser layout, paint and display.',
    targets:{readP95Ms:2,applyAndDrawP95Ms:5},results};
  if(process.argv.includes('--write'))writeFileSync(new URL('../labs-scratch/spoken-screens/replay-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(results.some(r=>r.committedMutations||JSON.stringify(r.actualTypes)!==JSON.stringify(r.expectedTypes)))process.exitCode=1;
}
