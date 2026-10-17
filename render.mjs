// Renders the daily Mystery Player video (1080x1920, 30 fps, 20 s, loops back to the hook).
// Usage: node render.mjs [selected.json] [output-dir]
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {HOOK_LINES, TITLES, pick, postText, themeFor} from './lib/daily.mjs';
import {checkEntry} from './lib/clues.mjs';

const project = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const input = path.resolve(process.argv[2] ?? path.join(project, 'player.json'));
const data = JSON.parse(await fs.readFile(input, 'utf8'));
const problems = checkEntry(data);
if (problems.length) throw Error(`Cannot render this player: ${problems.join('; ')}`);

// Fill in daily extras when rendering a single player file directly.
const date = data.date ?? new Date().toISOString().slice(0, 10);
const theme = data.theme ?? themeFor(data, date);
const hook = data.hook ?? pick(HOOK_LINES, date, 'hook');
const title = data.title ?? pick(TITLES, date, 'title')(data, theme);
const post = data.post ?? postText({player: data, date, theme, title});

const out = path.resolve(process.argv[3] ?? path.join(project, 'renders', data.slug));
const frames = path.join(out, 'frames');
await fs.rm(frames, {recursive: true, force: true});
await fs.mkdir(frames, {recursive: true});

export const FPS = 30;
export const DURATION = 20;
export const TIMELINE = {hookEnd: 1.6, clueStarts: [1.6, 5.9, 10.2], lockStart: 14.5, ctaStart: 16.0, loopStart: 19.4};

const asData = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const background = await asData(path.join(project, 'arena-background-v2.png'), 'image/png');
const press = await asData(path.join(project, 'PressStart2P-Regular.ttf'), 'font/ttf');
const silk = await asData(path.join(project, 'Silkscreen-Regular.ttf'), 'font/ttf');
const mascot = {};
for (const state of ['thinking', 'surprised', 'nervous', 'celebration']) {
  mascot[state] = [];
  for (let i = 0; i < 9; i++) mascot[state].push(await asData(path.join(project, 'assets', 'mascot', `${state}-${String(i).padStart(2, '0')}.png`), 'image/png'));
}

const payload = JSON.stringify({
  clues: data.clues.map((clue) => clue.text.toUpperCase()), jersey: data.jersey || '?', color: data.color || '#ff6428',
  hook: hook.toUpperCase(), theme: theme.label.toUpperCase(), background, mascot, T: TIMELINE, duration: DURATION,
});

// Safe zones (1080x1920): keep content below y=210 (top tabs), above y=1480 (caption/username)
// and left of x=900 between y=700 and y=1650 (TikTok/Shorts like/comment/share rail).
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Press;src:url(${press}) format('truetype')}@font-face{font-family:Silk;src:url(${silk}) format('truetype')}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#03060d}
.stage{position:absolute;inset:0;overflow:hidden;background:#040711 center/cover no-repeat;color:#f4f7fb}
.layer{position:absolute;inset:0}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,4,11,.35),rgba(1,4,11,.2) 40%,rgba(1,4,11,.45))}
.track{position:absolute;left:60px;top:214px;width:840px;height:10px;background:#263149;border-radius:5px}.fill{height:100%;background:#ff561b;border-radius:5px}
.brand{position:absolute;left:60px;top:240px;font:24px Press;letter-spacing:1px}.theme{position:absolute;left:60px;top:276px;font:24px Silk;color:#ff6428;letter-spacing:3px}
.hookline{position:absolute;left:60px;top:330px;width:960px;text-align:center;font:52px/1.3 Press;text-shadow:0 6px 0 #000,0 0 22px rgba(255,91,29,.55)}
.jerseywrap{position:absolute;left:290px;top:690px;width:500px;height:560px}
.hooksub{position:absolute;left:60px;top:1290px;width:840px;text-align:center;font:30px Silk;color:#24d8ff;letter-spacing:3px}
.card{position:absolute;left:60px;width:840px;height:262px;border:3px solid #29354b;border-radius:12px;background:rgba(5,10,22,.94)}.card.active{border-color:#ff6a27;box-shadow:0 0 26px rgba(255,106,39,.35)}
.status{position:absolute;left:30px;top:24px;font:24px Silk;color:#ff6428;letter-spacing:2px}.status.decode{color:#26d9ff}.diff{position:absolute;right:30px;top:24px;font:22px Silk;color:#9cabc2;letter-spacing:2px}
.cluetext{position:absolute;left:30px;top:72px;width:610px;font:34px/1.38 Press}
.dots{position:absolute;left:30px;top:70px;color:#ff5b1d;font:64px Silk;letter-spacing:8px}
.avatar{position:absolute;right:14px;bottom:10px;width:170px;height:170px;object-fit:contain;image-rendering:pixelated}
.clock{position:absolute;left:60px;top:1130px;width:840px;height:120px;border:3px solid #ff6428;border-radius:12px;background:#080d19}
.clocklabel{position:absolute;left:30px;top:22px;font:24px Silk;color:#9cabc2;letter-spacing:3px}.clocknum{position:absolute;right:34px;top:20px;font:76px Press}.clocknum.warn{color:#ff5b1d}
.pips{position:absolute;left:30px;width:560px;bottom:26px;display:flex;gap:10px}.pip{height:18px;flex:1;border-radius:4px;background:#283249}.pip.on{background:#ff5b1d}
.box{position:absolute;left:60px;width:840px;border:4px solid #ff6428;border-radius:14px;background:rgba(3,7,16,.96);text-align:center}
.locktitle{margin-top:80px;font:56px/1.35 Press}.locknum{margin-top:40px;font:220px Press;color:#ff5b1d;text-shadow:0 0 30px rgba(255,91,29,.6)}
.ctaA{margin-top:70px;font:40px/1.45 Press}.ctaSite{margin:34px auto 0;width:760px;font:40px/1.3 Silk;color:#26d9ff;letter-spacing:2px}
.ctaBio{margin-top:18px;font:30px Press;color:#ffd23f}.ctaMascot{width:220px;height:220px;object-fit:contain;image-rendering:pixelated;margin-top:26px}
.ctaComment{margin:26px auto 0;width:760px;padding:26px 10px;border:3px dashed #ff6428;border-radius:12px;font:40px/1.4 Press;color:#ff6428}
.flash{position:absolute;inset:0;background:#fff}
</style></head><body><div id="root"></div><script>
const D=${payload};const T=D.T;
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
const avatar=(state,t)=>D.mascot[state][Math.floor(t*11)%9];
const header=(t)=>'<div class="shade"></div><div class="track"><div class="fill" style="width:'+Math.max(20,840*t/D.duration)+'px"></div></div><div class="brand">FACTS OVER FEELINGS</div><div class="theme">MYSTERY PLAYER // '+esc(D.theme)+'</div>';
function jersey(t){const pulse=1+0.035*Math.sin(t*9);const q=0.55+0.45*Math.abs(Math.sin(t*5));
  return '<div class="jerseywrap" style="transform:scale('+pulse+')"><svg viewBox="0 0 500 560" width="500" height="560">'
  +'<defs><filter id="g"><feGaussianBlur stdDeviation="14"/></filter></defs>'
  +'<path d="M150 20 L205 20 Q250 85 295 20 L350 20 L360 120 Q385 150 430 160 L440 540 L60 540 L70 160 Q115 150 140 120 Z" fill="'+D.color+'" opacity=".55" filter="url(#g)"/>'
  +'<path d="M150 20 L205 20 Q250 85 295 20 L350 20 L360 120 Q385 150 430 160 L440 540 L60 540 L70 160 Q115 150 140 120 Z" fill="#0b1220" stroke="'+D.color+'" stroke-width="10"/>'
  +'<text x="250" y="400" text-anchor="middle" font-family="Press" font-size="'+(D.jersey.length>1?170:200)+'" fill="'+D.color+'" stroke="#000" stroke-width="8" paint-order="stroke">'+esc(D.jersey)+'</text>'
  +'<text x="420" y="120" text-anchor="middle" font-family="Press" font-size="90" fill="#ff5b1d" opacity="'+q+'">?</text></svg></div>'}
function hookScene(t){return header(t)+'<div class="hookline">'+esc(D.hook)+'</div>'+jersey(t)+'<div class="hooksub">3 CLUES // BEAT THE SHOT CLOCK</div>'}
function typedLength(i,local){return Math.floor((local-.5)*40)}
function clueScene(t){const starts=T.clueStarts;let current=Math.max(0,starts.findLastIndex(x=>t>=x));let body=header(t);
  for(let i=0;i<=current;i++){const local=t-starts[i];const full=D.clues[i];const typed=typedLength(i,local);
    const state=i<current?'revealed':local<.5?'decode':typed<full.length?'typing':'revealed';
    let text='',extra='',status='CLUE '+(i+1)+' // '+(state==='decode'?'DECODING':'REVEALED');
    if(state==='decode')extra='<div class="dots">'+'•••'.slice(0,1+Math.floor(local*6)%3)+'</div>';else text=esc(state==='typing'?full.slice(0,typed):full);
    const slide=i===current?(1-ease(local/.25))*80:0;const mood=['thinking','surprised','nervous'][i];
    body+='<div class="card '+(i===current?'active':'')+'" style="top:'+(300+i*277)+'px;transform:translateX('+slide+'px)"><div class="status '+(state==='decode'?'decode':'')+'">'+status+'</div><div class="diff">'+['HARD','MEDIUM','EASY'][i]+'</div><div class="cluetext">'+text+'</div>'+extra+'<img class="avatar" src="'+avatar(mood,local)+'"></div>'}
  const local=t-starts[current];const span=(current<2?starts[current+1]:T.lockStart)-starts[current];const n=Math.max(0,Math.ceil(5*(1-local/span)));
  body+='<div class="clock"><div class="clocklabel">SHOT CLOCK</div><div class="clocknum '+(n<=2?'warn':'')+'">'+n+'</div><div class="pips">'+[1,2,3,4,5].map(v=>'<i class="pip '+(v<=n?'on':'')+'"></i>').join('')+'</div></div>';return body}
function lockScene(t){const local=t-T.lockStart;const n=local<.5?3:local<1?2:1;const pop=1+0.25*(1-ease((local%.5)/.2));
  return header(t)+'<div class="box" style="top:380px;height:820px"><div class="locktitle">LOCK IN<br>YOUR GUESS</div><div class="locknum" style="transform:scale('+pop+')">'+n+'</div></div>'}
function ctaScene(t){const local=t-T.ctaStart;const rise=(k)=>'opacity:'+ease((local-k)/.25)+';transform:translateY('+(1-ease((local-k)/.25))*40+'px)';
  return header(t)+'<div class="box" style="top:300px;height:1150px"><div class="ctaA" style="'+rise(0)+'">ANSWER +<br>TODAY\\'S GAME:</div><div class="ctaSite" style="'+rise(.15)+'">PLAYFACTSOVERFEELINGS.COM</div><div class="ctaBio" style="'+rise(.3)+'">LINK IN BIO</div><img class="ctaMascot" src="'+avatar('celebration',local)+'"><div class="ctaComment" style="'+rise(.6)+'">1, 2 OR 3 CLUES?<br>COMMENT</div></div>'
  +(local<.1?'<div class="flash" style="opacity:'+(1-local/.1)*.8+'"></div>':'')}
window.draw=(t)=>{let html;
  if(t<T.hookEnd)html=hookScene(t);else if(t<T.lockStart)html=clueScene(t);else if(t<T.ctaStart)html=lockScene(t);
  else if(t<T.loopStart)html=ctaScene(t);
  else{const k=(t-T.loopStart)/(D.duration-T.loopStart);html='<div class="layer" style="opacity:'+(1-ease(k*2))+'">'+ctaScene(t)+'</div><div class="layer" style="opacity:'+ease(k*2-1)+'">'+hookScene(t-D.duration)+'</div>'}
  document.getElementById('root').innerHTML='<main class="stage" style="background-image:url('+D.background+')">'+html+'</main>'};
</script></body></html>`;

const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  await page.setContent(html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  for (let frame = 0; frame < FPS * DURATION; frame++) {
    await page.evaluate((t) => window.draw(t), frame / FPS);
    await page.screenshot({path: path.join(frames, `frame-${String(frame + 1).padStart(4, '0')}.png`)});
  }
} finally {
  await browser.close();
}

const speech = {
  hook: hook.toLowerCase().replace(/\b1\b/g, 'one').replace(/\b3\b/g, 'three').replace(/\b0\b/g, 'zero').replace(/90%/g, 'ninety percent'),
  clues: data.clues.map((clue) => clue.text),
};
await fs.writeFile(path.join(out, 'speech.json'), JSON.stringify({...speech, timeline: TIMELINE, duration: DURATION, fps: FPS}, null, 2));
const py = process.env.PYTHON_EXE ?? 'python';
const enc = spawnSync(py, [path.join(project, 'encode.py'), out], {encoding: 'utf8', stdio: 'inherit'});
if (enc.status !== 0) throw Error('Video encoding failed');
await fs.writeFile(path.join(out, 'post.txt'), post.text);
await fs.writeFile(path.join(out, 'release-notes.md'), `**Answer is not in this video** — viewers find it at PlayFactsOverFeelings.com.\n\nTwo downloads: **with music** and **no music** (add a trending sound in TikTok).\n\n### Title\n${post.title}\n\n### Caption\n${post.caption}\n`);
await fs.writeFile(path.join(out, 'sources.json'), JSON.stringify(data.sources ?? [], null, 2));
console.log(path.join(out, 'mystery-player.mp4'));
