import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const concepts = [
  { id: 'ashkey', name: 'ashkey', display: 'Ashkey', pronunciation:'ASH-kee', tagline:'Read the signal.', descriptor:'Satellite fire observations, in context.', dark:'#111f23', light:'#f7f3e8', accent:'#f2ad57', ink:'#152b2d', lightAccent:'#8b4909', muted:'#a7bbb6', font:'Arial, sans-serif', weight:600, tracking:-2, story:'A winged seed. An aperture. A key to the record.' },
  { id: 'brasa', name: 'brasa', display:'Brasa', pronunciation:'BRAH-sah', tagline:'See the season.', descriptor:'An atlas of satellite fire observations.', dark:'#30202d', light:'#fcf1df', accent:'#ffae86', ink:'#422337', lightAccent:'#a64022', muted:'#d0b6bf', font:'Georgia, serif', weight:400, tracking:-3, story:'Warm paper, an ember, and the layers of a field atlas.' },
  { id: 'vestige', name: 'VESTIGE', display:'Vestige', pronunciation:'VES-tij', tagline:'Follow what remains.', descriptor:'A satellite record of burning activity.', dark:'#14242e', light:'#edf2f5', accent:'#8dd4e7', ink:'#163440', lightAccent:'#1d6378', muted:'#aac3cd', font:'Arial, sans-serif', weight:500, tracking:5, story:'An observed point. Two tracks. An evidence journal.' }
];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function icon(c, fg, bg, small=false) {
  if(c.id === 'ashkey') return `<path fill="${fg}" fill-rule="evenodd" d="M10 35C10 18 24 8 45 7C48 24 43 39 31 44L51 59L57 51L50 46L46 50L39 44C49 33 49 18 45 7C24 8 10 18 10 35ZM22 29a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z"/><path d="M19 43L35 39L46 49L42 54Z" fill="${fg}"/>`;
  if(c.id === 'brasa') return `<path d="M34 5C31 18 14 22 12 37C10 52 21 61 34 60C50 59 58 45 50 32C44 22 39 19 34 5Z" fill="${fg}"/><path d="M22 38Q32 26 44 35${small?'':'M21 47Q34 38 47 44'}" fill="none" stroke="${bg}" stroke-width="${small?6:4}" stroke-linecap="round"/>`;
  return small ? `<path d="M8 14L29 57L57 8" fill="none" stroke="${fg}" stroke-width="9" stroke-linejoin="round"/><circle cx="15" cy="7" r="5" fill="${fg}"/>` : `<path d="M7 17L29 58L58 7M21 20L30 38L47 9" fill="none" stroke="${fg}" stroke-width="5" stroke-linejoin="round"/><circle cx="11" cy="7" r="4" fill="${fg}"/>`;
}
function svg(w,h,title,content){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${content}</svg>\n`;}
function word(c, fg, accent, bg, x=0,y=0,scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><g transform="translate(0 0)">${icon(c,accent,bg)}</g><text x="82" y="48" fill="${fg}" font-family="${c.font}" font-size="${c.id==='vestige'?39:55}" font-weight="${c.weight}" letter-spacing="${c.tracking}">${c.name}</text></g>`;}
for (const c of concepts) {
  const dir = join(root,c.id); await mkdir(dir,{recursive:true});
  for(const mode of ['light','dark','mono']){
    const bg = mode==='dark'?c.dark:mode==='mono'?'#ffffff':c.light;
    const fg = mode==='dark'?c.light:mode==='mono'?'#111111':c.ink;
    const accent = mode==='dark'?c.accent:mode==='mono'?'#111111':c.lightAccent;
    await writeFile(join(dir,`symbol-${mode}.svg`),svg(80,80,`${c.display} ${mode} symbol`,`<rect width="80" height="80" fill="${bg}"/><g transform="translate(8 8)">${icon(c,accent,bg)}</g>`));
    await writeFile(join(dir,`wordmark-${mode}.svg`),svg(430,104,`${c.display} ${mode} editable wordmark`,`<rect width="430" height="104" fill="${bg}"/>${word(c,fg,accent,bg,22,20)}`));
    if(mode!=='mono'){
      const border = mode==='dark'?'#ffffff26':'#00000026';
      await writeFile(join(dir,`header-${mode}.svg`),svg(1280,120,`${c.display} ${mode} application header concept`,`<rect width="1280" height="120" fill="${bg}"/>${word(c,fg,accent,bg,28,26,.72)}<path d="M356 24V96" stroke="${border}"/><g fill="${fg}" font-family="Arial,sans-serif" font-size="18"><text x="394" y="67" fill="${accent}">Explore</text><text x="501" y="67">Report</text><text x="603" y="67">Fire Calendar</text><text x="772" y="67">Science</text><text x="893" y="67">Sources</text></g><path d="M394 83H454" stroke="${accent}" stroke-width="3"/><text x="1216" y="66" text-anchor="end" fill="${fg}" font-family="Arial,sans-serif" font-size="14">IDENTITY CONCEPT</text><path d="M0 119H1280" stroke="${border}"/>`));
      const subt = mode==='dark'?c.muted:c.ink;
      // Original brand art, not a data diagram. Text and marks remain editable.
      const art = c.id==='ashkey'?`<g transform="translate(920 170) scale(5)">${icon(c,accent,bg)}</g>`:c.id==='brasa'?`<g transform="translate(900 170) scale(5.2)">${icon(c,accent,bg)}</g>`:`<g transform="translate(890 185) scale(5)">${icon(c,accent,bg)}</g>`;
      await writeFile(join(dir,`cover-${mode}.svg`),svg(1280,720,`${c.display} ${mode} pitch cover concept`,`<rect width="1280" height="720" fill="${bg}"/>${word(c,fg,accent,bg,64,55,.8)}<text x="66" y="246" fill="${subt}" font-family="Arial,sans-serif" font-size="17" letter-spacing="3">SATELLITE OBSERVATIONS · EARTH · TIME</text><text x="62" y="346" fill="${fg}" font-family="${c.font}" font-size="${c.id==='vestige'?62:78}" font-weight="${c.weight}">${esc(c.tagline)}</text><text x="66" y="410" fill="${subt}" font-family="Arial,sans-serif" font-size="26">${esc(c.descriptor)}</text><text x="66" y="611" fill="${subt}" font-family="Arial,sans-serif" font-size="18">NASA Space Apps 2026 · Identity exploration</text><text x="66" y="646" fill="${subt}" font-family="Arial,sans-serif" font-size="15">Provisional concept · Final name remains open · No NASA endorsement</text>${art}`));
    }
  }
  await writeFile(join(dir,'favicon.svg'),svg(64,64,`${c.display} small icon`,`<rect width="64" height="64" rx="12" fill="${c.dark}"/><g transform="translate(5 5) scale(.84)">${icon(c,c.accent,c.dark,true)}</g>`));
}
await writeFile(join(root,'brand.json'), JSON.stringify({status:'identity concepts — no final name selected',provisional:{name:'PyroBridge',descriptor:'Satellite fire observations, in context.'},directions:concepts},null,2)+'\n');
console.log('Created 33 editable SVG concept assets and brand.json');
