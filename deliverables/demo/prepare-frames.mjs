/** Compose captioned, honest still-capture frames. No remote assets or scientific data fabrication. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const [captures,globe='globe-opening.png',atlas='atlas-world.png']=process.argv.slice(2);
if(!captures)throw new Error('Usage: node prepare-frames.mjs CAPTURES_DIR GLOBE_FILENAME ATLAS_FILENAME');
const sharpEntry=process.env.NASA_SHARP_ENTRY||'/Users/andramariasmarandache/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
const {default:sharp}=await import(pathToFileURL(sharpEntry).href);
const spec=[
 {id:'01-globe',file:globe,start:0,end:4,title:'Read the fire record',subtitle:'PyroBridge · NASA FIRMS observations',credit:'Data: NASA FIRMS · Global snapshot: 13–14 Nov 2026 · Provisional identity'},
 {id:'02-atlas',file:atlas,start:4,end:9,title:'Open a place. Keep the context.',subtitle:'Global snapshot and historical studies are separate',credit:'Data: NASA FIRMS · Boundaries: Natural Earth · Actual application capture'},
 {id:'03-sensors',file:'regional-comparison.png',start:9,end:14,title:'Two sensors. Different observations.',subtitle:'Detections are thermal pixels, not individual fires',credit:'Data: NASA FIRMS · Image: NASA EOSDIS GIBS / Aqua MODIS · 22 Aug 2023'},
 {id:'04-report',file:'report-overview.png',start:14,end:21,title:'89% concentrated in August',subtitle:'4,178 / 4,685 VIIRS detections · Greek studies · 2023',credit:'Data: NASA FIRMS · Evros + Evia study rectangles · Descriptive source-record share'},
 {id:'05-science',file:'science-status.png',start:21,end:26,title:'Test the bridge before trusting it',subtitle:'48 sampled cell-passes · Monthly estimates remain gated',credit:'Selected pilot: Evia + Evros · Independent monthly validation still required'},
 {id:'06-closing',file:'report-overview.png',start:26,end:29,title:'Choose a place. Follow a season.',subtitle:'PyroBridge · Read the fire record',credit:'Real observations · Scoped evidence · NASA Space Apps 2026'}
];
const out=join(root,'frames');await mkdir(out,{recursive:true});
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const W=1920,H=1080;
for(const scene of spec){
 const source=await readFile(resolve(captures,scene.file));
 const metadata=await sharp(source).metadata();
 const panel=await sharp(source).resize({width:1856,height:804,fit:'inside',withoutEnlargement:false}).png().toBuffer();
 const pm=await sharp(panel).metadata();
 const chrome=Buffer.from(`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="52" fill="#0e191c"/><text x="64" y="33" fill="#f1c58d" font-family="Arial,sans-serif" font-size="20" letter-spacing="2">PYROBRIDGE / CAPTURE MONTAGE</text><text x="1856" y="33" fill="#d6e0dd" text-anchor="end" font-family="Arial,sans-serif" font-size="19">AI-assisted interface · Real NASA observations</text><rect x="0" y="872" width="1920" height="208" fill="#101d21"/><path d="M64 872H1856" stroke="#4d625f"/><text x="64" y="939" fill="#f8e9d5" font-family="Arial,sans-serif" font-size="48" font-weight="600">${esc(scene.title)}</text><text x="64" y="991" fill="#d1e0da" font-family="Arial,sans-serif" font-size="29">${esc(scene.subtitle)}</text><text x="64" y="1047" fill="#adbfba" font-family="Arial,sans-serif" font-size="20">${esc(scene.credit)}</text><text x="1856" y="1047" text-anchor="end" fill="#adbfba" font-family="Arial,sans-serif" font-size="20">${String(scene.start).padStart(2,'0')}–${String(scene.end).padStart(2,'0')} s</text></svg>`);
 const path=join(out,scene.id+'.png');
 await sharp({create:{width:W,height:H,channels:3,background:'#0c1518'}}).composite([{input:panel,left:Math.round((W-pm.width)/2),top:58+Math.round((804-pm.height)/2)},{input:chrome,left:0,top:0}]).png().toFile(path);
 scene.sourceDimensions=[metadata.width,metadata.height];scene.sha256=createHash('sha256').update(source).digest('hex');scene.frame=scene.id+'.png';
 console.log(scene.id,scene.file,scene.sourceDimensions.join('×'));
}
await writeFile(join(root,'render-manifest.json'),JSON.stringify({title:'PyroBridge — Read the fire record',format:'Edited montage of verified application still captures, not a continuous screen recording',durationSeconds:29,fps:30,frames:870,dimensions:[W,H],audio:false,createdAt:new Date().toISOString(),inputs:spec},null,2)+'\n');
