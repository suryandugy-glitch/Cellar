import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const studio = 'https://github.com/suryandugy-glitch/';
const release = studio + 'Cellar-Studio/releases/download/spacefix-v1.1.0/';
const products = [
  { id:'spacefix', name:'Cellar SpaceFix', area:'Desktop storage', status:'Windows utility', kind:'pilot',
    intro:'Find forgotten space without risking your files.', description:'Private on-device recommendations, SHA-256 duplicate matches, a bold desktop review interface, and byte-verified copies to a second drive.',
    audience:'Windows users with a full system drive and a second volume for personal files.',
    workflow:'Scan a personal folder and see explainable size, age and duplicate insights. Choose files manually, copy them to another volume, verify each byte, and separately approve any recycling.',
    example:['Source','Personal videos on C:','Destination','Archive folder on D:','Check','Original and copy match'], action:['SpaceFix downloads','./spacefix-downloads.html'] },
  { id:'guard', name:'Cellar Guard', area:'Data compatibility', status:'Working pilot', kind:'pilot',
    intro:'Catch a broken CSV export before it ships.', description:'Check an export against the column names and rules that downstream customers rely on.',
    audience:'Teams shipping recurring CSV files to customers or internal reporting systems.',
    workflow:'Define a consumer contract, run the checker on a candidate export, and inspect failures. The CLI can block a release when a required field disappears.',
    example:['Expected column','order_id','Candidate column','id','Inventory report','Release blocked'], action:['Try the checker','./guard.html'], extra:['Setup and CLI guide','./guide.html'] },
  { id:'buildclinic', name:'BuildClinic', area:'Build diagnostics', status:'Early-stage tool', kind:'prototype',
    intro:'Find the useful error in a long build log.', description:'Investigate compiler and build failures by following the evidence in the build output.',
    audience:'Developers debugging a failed build locally or in continuous integration.',
    workflow:'Start with the first failing task and its nearby messages. Use those lines to identify the likely cause, apply a change, and rerun that task.',
    example:['Input','Build log','Evidence','First failing task','Follow-up','Rerun the task'], repo:'buildclinic' },
  { id:'clausecraft', name:'ClauseCraft', area:'Document review', status:'Prototype', kind:'prototype',
    intro:'Find passages that need a closer read.', description:'Highlight document patterns and missing fields so a reviewer can return to the relevant passage.',
    audience:'People preparing a document for a human review.',
    workflow:'Review the flagged passages in context, check missing details with the document owner, and record which items need professional review.',
    example:['Input','Document text','Finding','Missing field','Next step','Human review'], repo:'ClauseCraft' },
  { id:'plancliff', name:'PlanCliff', area:'Database performance', status:'Research', kind:'research',
    intro:'Investigate the point where a query slows down.', description:'Study how changes in data volume or distribution can cause a database to select a slower execution plan.',
    audience:'Database engineers investigating performance regressions before deployment.',
    workflow:'Run one query against controlled data distributions. Compare the planner’s choices and repeat timings around a suspected slowdown.',
    example:['Variable','Data distribution','Evidence','Execution plan','Measure','Query latency'], repo:'systems-bottleneck-lab' },
  { id:'crashcheck', name:'CrashCheck', area:'Storage reliability', status:'Research', kind:'research',
    intro:'Check what survives an interrupted write.', description:'Investigate the consistency of SQLite-backed applications after a process stops mid-operation.',
    audience:'Engineers responsible for persistent application data.',
    workflow:'Define an invariant, interrupt a controlled workload, and inspect the recovered database. Keep the failing sequence so another engineer can replay it.',
    example:['Workload','SQLite writes','Interruption','Process stops','Check','Recovered state'], repo:'PQL-Storage' },
  { id:'deadlock', name:'Deadlock Sentinel', area:'JVM diagnostics', status:'Java prototype', kind:'research',
    intro:'Follow the locks behind a frozen Java app.', description:'Trace the cycle when a group of threads are each waiting for another thread to release a lock.',
    audience:'Java developers investigating a service that has stopped making progress.',
    workflow:'Start with a JVM thread dump. Inspect the lock owners and waiting threads, then follow the cycle in the trace explorer.',
    example:['Thread A','Waits for lock B','Thread B','Waits for lock A','Finding','Circular wait'], action:['Open trace explorer','./deadlock.html'], extra:['Java quick start','./deadlock.html#java'] },
  { id:'learn', name:'Cellar Learn', area:'Engineering education', status:'Candidate', kind:'prototype',
    intro:'Follow an algorithm one operation at a time.', description:'Explore how the state of a data structure changes as an algorithm runs.',
    audience:'Students connecting a classroom explanation to an implementation.',
    workflow:'Trace a small input, inspect each intermediate state, and compare the steps when the input changes. The educational project is a candidate for the Studio portfolio.',
    example:['Input','Small data set','Trace','Intermediate states','Compare','Operation count'], repo:'dsa-visualizer' },
];
const services = [
  ['engineering','Product engineering','Implement a scoped change to a Studio tool.','Start with the affected workflow and a reproducible example. Define the expected behavior before changing the implementation.','A working feature, regression checks, and instructions for running it.'],
  ['research','Research and verification','Test an engineering hypothesis under repeatable conditions.','Choose an invariant or baseline. Run the experiment with controlled inputs and preserve the evidence so another engineer can repeat it.','An experimental fixture, measured results, and a record of the limitations.'],
  ['documentation','Design and documentation','Make a product easier to navigate, use, and understand.','Walk through a real task from first visit to completion. Check labels, keyboard access, instructions, and recovery from common errors.','A revised workflow and examples that a new user can follow.'],
];
const link = ([label,url]) => `<a class="action" href="${url}">${label}<span aria-hidden="true"> ↗</span></a>`;
const tile = (label,url,desc) => `<a class="tile" href="${url}"><strong>${label}</strong><span>${desc}</span><i aria-hidden="true">↗</i></a>`;
const page = (title,body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | Cellar Studio</title><link rel="icon" href="./logo.svg"><link rel="stylesheet" href="./catalog.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="bar"><div><a class="brand" href="./"><img src="./logo.svg" width="30" height="30" alt="">Cellar Studio</a><nav aria-label="Main"><a href="./explore.html">Products</a><a href="./downloads.html">Downloads</a><a href="./services.html">Services</a></nav></div></header><main id="main">${body}</main><footer><a href="./">Cellar Studio</a><a href="./handbook.html#contribute">Contribute</a></footer></body></html>`;
const head = (label,title,intro) => `<header class="heading"><p class="label">${label}</p><h1>${title}</h1><p class="lead">${intro}</p></header>`;
const back = (label,url) => `<a class="back" href="${url}">← ${label}</a>`;
const out = resolve(process.argv[2]);
await mkdir(out,{recursive:true});
const save = (id,title,body) => writeFile(resolve(out,id+'.html'),page(title,body));
for (const p of products) {
  const action = p.action ?? ['Source downloads','./'+p.id+'-downloads.html'];
  const fields = p.example.map((v,i)=>i%2 ? `<dd>${v}</dd>` : `<dt>${v}</dt>`).join('');
  await save('product-'+p.id,p.name,back('Products','./explore.html')+`<section class="hero"><div>${head(p.area,p.name,p.intro)}<div class="actions">${link(action)}${p.extra?link(p.extra)+link(['Source downloads','./'+p.id+'-downloads.html']):''}</div></div><aside class="spec"><h2>Workflow example</h2><dl>${fields}</dl></aside></section><section class="brief"><h2>Product brief</h2><div><p class="label">${p.status}</p><p class="desc">${p.description}</p><h3>Who it helps</h3><p>${p.audience}</p><h3>How it works</h3><p>${p.workflow}</p>${p.repo?'<p class="note">The source download contains project files for local development.</p>':''}</div></section>`);
}
for (const p of products.filter(p=>p.id!=='spacefix')) {
  const shared = !p.repo;
  const source = studio + (p.repo ?? 'Cellar-Studio') + '/archive/HEAD.zip';
  const instructions = p.id==='guard' ? 'Extract the Studio source archive and run the launcher at its root with Java 21 or newer.'
    : p.id==='deadlock' ? 'Extract the Studio archive, then open products/deadlock-sentinel and follow the Java quick start.'
    : 'Extract the project archive and open its README for development and setup instructions.';
  await save(p.id+'-downloads',p.name+' downloads',back(p.name,'./product-'+p.id+'.html')+head(p.area,p.name+' downloads','Project source for local development.')+tile('Download source ZIP',source,shared?'Cellar Studio repository · source archive':p.repo+' · source archive')+'<section class="brief"><h2>Getting started</h2><div><p>'+instructions+'</p>'+(p.extra?link(p.extra):'')+'</div></section>');
}
await save('downloads','Downloads',head('Distribution','Downloads','Choose a product to see its available files and setup instructions.')+'<div class="tiles">'+products.map(p=>tile(p.name,'./'+p.id+'-downloads.html',p.id==='spacefix'?'Windows x64 · Desktop release':'Project source · ZIP')).join('')+'</div>');
await save('spacefix-downloads','SpaceFix downloads',back('Cellar SpaceFix','./product-spacefix.html')+head('Windows x64 · Version 1.1.0','SpaceFix downloads','Choose how you want to open SpaceFix. Both Windows executables include Java.')+`<div class="tiles">${tile('Download SpaceFix.exe',release+'SpaceFix.exe','Windows x64 · Java included')}${tile('Download SpaceFix Setup',release+'SpaceFix-Setup.exe','Windows x64 · Java included')}</div><section class="brief"><h2>After downloading</h2><div><h3>Direct launch</h3><p>Open Downloads and double-click SpaceFix.exe. The window opens after its runtime extracts. Choose a personal folder and a second drive to begin.</p><h3>Installed version</h3><p>Run SpaceFix-Setup.exe, complete setup, and open SpaceFix from the Start menu.</p><h3>Java edition</h3><p>For a desktop with Java 21 or newer, extract the archive and run SpaceFix.jar.</p>${link(['Download Java ZIP',release+'SpaceFix.zip'])}</div></section>`);
await save('services','Services',head('Studio collaboration','Services','Explore the work contributors can take on across Cellar Studio projects.')+'<div class="tiles">'+services.map(([id,name,desc])=>tile(name,'./service-'+id+'.html',desc)).join('')+'</div>');
for (const [id,name,desc,scope,result] of services) {
  await save('service-'+id,name,back('Services','./services.html')+head('Studio collaboration',name,desc)+`<section class="brief"><h2>Service brief</h2><div><h3>Scope of work</h3><p>${scope}</p><h3>Deliverables</h3><p>${result}</p>${link(['Contribution guide','./handbook.html#contribute'])}</div></section>`);
}
const searchForm = `<div class="directory-tools"><label for="product-search">Find a product<input id="product-search" type="search" placeholder="Name or engineering problem"></label><div class="segments" role="group" aria-label="Filter by maturity">${['All','Pilot','Prototype','Research'].map((kind,i)=>`<button type="button" data-filter="${kind.toLowerCase()}" aria-pressed="${i===0}">${kind}</button>`).join('')}</div></div><p id="result-count" aria-live="polite">${products.length} projects</p>`;
const entries = products.map(p=>`<a class="tile product-card" data-kind="${p.kind}" data-search="${p.area.toLowerCase()}" href="./product-${p.id}.html"><strong>${p.name}</strong><span>${p.area} · ${p.status}</span><i aria-hidden="true">↗</i></a>`).join('');
await save('explore','Products',head('Studio directory','Products','Choose a product for its brief, technical details, and available releases.')+searchForm+'<div class="index-grid">'+entries+'</div><p id="empty-state" hidden>No matching products. Try another name or filter.</p><script src="./studio.js" defer></script><script src="./catalog-links.js" defer></script>');
