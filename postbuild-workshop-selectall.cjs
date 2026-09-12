const fs = require('node:fs');

const featurePath = 'dist/features.js';
if (!fs.existsSync(featurePath)) throw new Error('dist/features.js was not produced before select-all patch');
let features = fs.readFileSync(featurePath, 'utf8');

const progressMarker = '<div class="workshop-progress-summary" aria-live="polite"><b id="workshopProgressText"></b><span id="workshopProgressPct"></span></div><div class="workshop-progress"><i></i></div>';
const progressReplacement = '<div class="workshop-progress-summary" aria-live="polite"><b id="workshopProgressText"></b><span id="workshopProgressPct"></span></div><div class="workshop-bulk-actions"><button id="workshopSelectAll" type="button">Mark all complete</button><button id="workshopClearAll" type="button" disabled>Clear all</button></div><div class="workshop-progress"><i></i></div>';
if (!features.includes(progressMarker)) throw new Error('Workshop bulk-action insertion point not found');
features = features.replace(progressMarker, progressReplacement);

const safetyMarker = "$'workshopSafety'";

const updateMarker = "$('workshopSafety').textContent=complete?'Completion reflects the calculated plan, not a physical verification. Confirm actual remaining material before saving it to inventory.':'Planning guide only. Measure twice and confirm actual stock, blade/kerf, joints and installation requirements before every cut or placement.';";
const updateReplacement = updateMarker + "\n    $('workshopSelectAll').disabled=complete;\n    $('workshopClearAll').disabled=done===0;";
if (!features.includes(updateMarker)) throw new Error('Workshop progress update block not found');
features = features.replace(updateMarker, updateReplacement);

const handlerMarker = "checks.forEach(x=>x.addEventListener('change',updateProgress));";
const handlerReplacement = handlerMarker + "\n  $('workshopSelectAll').onclick=()=>{checks.forEach(x=>{x.checked=true;});updateProgress();};\n  $('workshopClearAll').onclick=()=>{checks.forEach(x=>{x.checked=false;});updateProgress();};";
if (!features.includes(handlerMarker)) throw new Error('Workshop checklist handler insertion point not found');
features = features.replace(handlerMarker, handlerReplacement);

fs.writeFileSync(featurePath, features);

const cssPath = 'dist/style.css';
if (fs.existsSync(cssPath)) {
  fs.appendFileSync(cssPath, String.raw`

/* Workshop Mode bulk checklist controls */
.workshop-bulk-actions{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 14px}
.workshop-bulk-actions button{border:1px solid #b9c9c0;background:#fff;color:#174f3e;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
.workshop-bulk-actions button:first-child{background:#174f3e;color:#fff;border-color:#174f3e}
.workshop-bulk-actions button:disabled{opacity:.45;cursor:default}
@media(max-width:600px){.workshop-bulk-actions{display:grid;grid-template-columns:1fr 1fr}.workshop-bulk-actions button{width:100%;min-height:44px}}
`);
}

console.log('Workshop Mode postbuild: added Mark all complete and Clear all controls.');
