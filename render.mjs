// Renders the daily Mystery Player video (1080x1920, 30 fps, 24 s).
// One column stays inside the TikTok/Shorts safe area. The end card is a single
// composition: nameplate on the jersey, then the site line. Usage:
//   node render.mjs [selected.json] [output-dir]
// PREVIEW_TIMES=0.2,3,18 renders only those seconds and skips encode.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {HOOK_LINES, TITLES, pick, postText, themeFor} from './lib/daily.mjs';
import {checkEntry} from './lib/clues.mjs';
import {DURATION, FPS, TIMELINE} from './lib/timeline.mjs';

const project = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const input = path.resolve(process.argv[2] ?? path.join(project, 'player.json'));
const data = JSON.parse(await fs.readFile(input, 'utf8'));
const problems = checkEntry(data);
if (problems.length) throw Error(`Cannot render this player: ${problems.join('; ')}`);

const date = data.date ?? new Date().toISOString().slice(0, 10);
const theme = data.theme ?? themeFor(data, date);
const hook = data.hook ?? pick(HOOK_LINES, date, 'hook');
const title = data.title ?? pick(TITLES, date, 'title')(data, theme);
const post = data.post ?? postText({player: data, date, theme, title});

const out = path.resolve(process.argv[3] ?? path.join(project, 'renders', data.slug));
const frames = path.join(out, 'frames');
await fs.rm(frames, {recursive: true, force: true});
await fs.mkdir(frames, {recursive: true});

export {FPS, DURATION, TIMELINE};

const asData = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const press = await asData(path.join(project, 'PressStart2P-Regular.ttf'), 'font/ttf');
const mascotSheet = await asData(path.join(project, 'assets', 'mascot.png'), 'image/png');

async function optionalHeadshot(player) {
  const source = player.headshot || player.image;
  if (!source || typeof source !== 'string') return null;
  try {
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source, {signal: AbortSignal.timeout(8000)});
      if (!response.ok) return null;
      const mime = (response.headers.get('content-type') || 'image/png').split(';')[0];
      const bytes = Buffer.from(await response.arrayBuffer());
      return `data:${mime};base64,${bytes.toString('base64')}`;
    }
    const file = path.resolve(project, source);
    const mime = /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png';
    return await asData(file, mime);
  } catch {
    return null;
  }
}

const headshot = await optionalHeadshot(data);
const payload = JSON.stringify({
  clues: data.clues.map((clue) => clue.text.toUpperCase()),
  jersey: data.jersey || '?',
  color: data.color || '#FF6A1A',
  name: data.player,
  headshot,
  hook: hook.toUpperCase(),
  theme: theme.label.toUpperCase(),
  mascot: mascotSheet,
  T: TIMELINE,
  duration: DURATION,
});

// Safe column: x 168–912 (centered on 1080, right edge left of the 15% button rail),
// y 248–1480 (below the top 12%, above the bottom 20%).
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Press;src:url(${press}) format('truetype')}
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#07101f}
.stage{position:absolute;inset:0;overflow:hidden;background:#07101f;color:#f4f7fb;
  background-image:linear-gradient(rgba(255,200,61,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,200,61,.045) 1px,transparent 1px);
  background-size:32px 32px}
.layer{position:absolute;inset:0}
.crt{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.16) 0 1px,transparent 1px 4px);mix-blend-mode:multiply}
.vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 48%,rgba(0,0,0,.42) 100%)}
.track{position:absolute;left:168px;top:248px;width:744px;height:20px;display:flex;gap:4px}
.seg{flex:1;background:#152038;box-shadow:inset 0 0 0 2px #24324e}
.seg.on{background:#FFC83D;box-shadow:none}
.seg.lead{background:#FF6A1A;box-shadow:0 0 10px #FF6A1A}
.brandrow{position:absolute;left:168px;top:284px;width:744px;height:40px;display:flex;align-items:center;justify-content:space-between}
.brand{font:16px/16px Press;color:#f4f7fb}
.theme{font:16px/16px Press;color:#FFC83D}
.hookline{position:absolute;left:168px;top:348px;width:744px;height:120px;display:flex;align-items:center;justify-content:center;text-align:center;
  font:26px/42px Press;color:#f4f7fb;text-shadow:0 4px 0 #000,0 0 16px rgba(255,106,26,.55)}
.hooksub{position:absolute;left:168px;top:1284px;width:744px;height:40px;display:flex;align-items:center;justify-content:center;
  font:16px/16px Press;color:#FFC83D;letter-spacing:1px}
.shell{position:absolute;left:168px;width:744px;padding:6px;background:#FF6A1A;
  clip-path:polygon(0 16px,16px 16px,16px 0,calc(100% - 16px) 0,calc(100% - 16px) 16px,100% 16px,100% calc(100% - 16px),calc(100% - 16px) calc(100% - 16px),calc(100% - 16px) 100%,16px 100%,16px calc(100% - 16px),0 calc(100% - 16px));
  filter:drop-shadow(0 0 14px rgba(255,106,26,.35))}
.shell.dim{background:#31425f;filter:none}
.shell.gold{background:#FFC83D;filter:drop-shadow(0 0 18px rgba(255,200,61,.45))}
.inner{height:100%;background:#0c1730;display:flex;flex-direction:column;
  clip-path:polygon(0 12px,12px 12px,12px 0,calc(100% - 12px) 0,calc(100% - 12px) 12px,100% 12px,100% calc(100% - 12px),calc(100% - 12px) calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,12px calc(100% - 12px),0 calc(100% - 12px))}
.cardhead{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex:none}
.cardhead span{font:16px/16px Press}
.clue-k{color:#FF6A1A}
.diff{color:#FFC83D}
.cardbody{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:12px 28px 20px;text-align:center;font:28px/42px Press;color:#f4f7fb}
.cardbody.mid{align-items:center;padding-top:0}
.qmark{font:88px/88px Press;color:#FFC83D;text-shadow:0 0 16px rgba(255,200,61,.65)}
.timer{position:absolute;left:168px;top:1212px;width:744px;height:112px}
.timerrow{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 28px}
.timerlabel{font:16px/16px Press;color:#FFC83D}
.timernum{font:40px/40px Press;color:#FFC83D;min-width:48px;text-align:right}
.timernum.warn{color:#FF6A1A;text-shadow:0 0 12px rgba(255,106,26,.8)}
.pips{display:flex;gap:8px;height:24px;align-items:center;padding:0 28px}
.pip{flex:1;height:20px;background:#1c2944}
.pip.on{background:#FF6A1A;box-shadow:0 0 8px #FF6A1A}
.inner.lockin{align-items:center;justify-content:center}
.inner.timerin{justify-content:center;gap:8px}
.locktitle{margin:0;text-align:center;font:28px/44px Press;color:#f4f7fb}
.locknum{margin-top:40px;text-align:center;font:168px/168px Press;color:#FF6A1A;text-shadow:0 0 24px rgba(255,106,26,.75)}
.jerseywrap{position:absolute}
.plate{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#FFC83D;color:#07101f;
  box-shadow:0 0 0 4px #07101f,0 0 16px rgba(255,200,61,.75);text-align:center;padding:16px 18px;
  clip-path:polygon(0 8px,8px 8px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 8px) calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 8px),0 calc(100% - 8px))}
.plate span{display:block;font-family:Press;line-height:1;height:1em;white-space:nowrap}
.ctaBlock{position:absolute;left:24px;width:696px;text-align:center;font:20px/36px Press;color:#FFC83D;text-shadow:0 0 12px rgba(255,200,61,.45)}
.ctaUrl{display:block;margin-top:12px;color:#FF6A1A}
.mascot{position:absolute;width:128px;height:128px;background-repeat:no-repeat;image-rendering:pixelated;image-rendering:crisp-edges}
.headshot{position:absolute;width:140px;height:140px;object-fit:cover;image-rendering:auto;border:4px solid #FFC83D;background:#07101f}
.bit{position:absolute;width:12px;height:12px}
.flash{position:absolute;inset:0;background:#fff;pointer-events:none}
</style></head><body><div id="root"></div><script>
const D=${payload};const T=D.T;
const COL=168, CW=744, CX=540;
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
const MOODS=['idle','thinking','surprised','hype','celebrate','sad'];
const M=160;
function mascot(name,x,y,size){
  const i=MOODS.indexOf(name);
  const s=size||M;
  return '<div class="mascot" style="left:'+x+'px;top:'+y+'px;width:'+s+'px;height:'+s+'px;background-image:url('+D.mascot+');background-size:'+(s*6)+'px '+s+'px;background-position:-'+(i*s)+'px 0"></div>';
}
function header(t){
  const n=24, filled=Math.round(n*Math.min(1,Math.max(0,t)/D.duration));
  let segs='';
  for(let i=0;i<n;i++) segs+='<i class="seg'+(i<filled?' on':'')+(i===filled-1?' lead':'')+'"></i>';
  return '<div class="crt"></div><div class="vignette"></div><div class="track">'+segs+'</div>'
    +'<div class="brandrow"><span class="brand">FACTS OVER FEELINGS</span><span class="theme">'+esc(D.theme)+'</span></div>';
}
function jerseySvg(showMark, numBaseline){
  const numSize=String(D.jersey).length>1?128:156;
  const q=showMark?'<text x="250" y="250" text-anchor="middle" font-family="Press" font-size="120" fill="#FFC83D">?</text>':'';
  const num=showMark?'':'<text x="250" y="'+(numBaseline||468)+'" text-anchor="middle" font-family="Press" font-size="'+numSize+'" fill="'+D.color+'" stroke="#07101f" stroke-width="10" paint-order="stroke">'+esc(D.jersey)+'</text>';
  return '<svg viewBox="0 0 500 560" width="100%" height="100%">'
    +'<path d="M150 28 L205 28 Q250 92 295 28 L350 28 L362 128 Q388 156 438 168 L446 532 L54 532 L62 168 Q112 156 138 128 Z" fill="'+D.color+'" opacity=".35"/>'
    +'<path d="M150 28 L205 28 Q250 92 295 28 L350 28 L362 128 Q388 156 438 168 L446 532 L54 532 L62 168 Q112 156 138 128 Z" fill="#0c1730" stroke="'+D.color+'" stroke-width="12"/>'
    +num+q+'</svg>';
}
function jerseyBox(left,top,w,h,showMark,numBaseline){
  return '<div class="jerseywrap" style="left:'+left+'px;top:'+top+'px;width:'+w+'px;height:'+h+'px">'+jerseySvg(showMark,numBaseline)+'</div>';
}
function hookScene(t){
  const subTop=1284, top=484, h=subTop-20-top, w=Math.round(h*500/560), left=Math.round(CX-w/2);
  return header(t||0)+'<div class="hookline">'+esc(D.hook)+'</div>'
    +jerseyBox(left,top,w,h,true)
    +'<div class="hooksub" style="top:'+subTop+'px">3 CLUES  ·  BEAT THE SHOT CLOCK</div>'
    +mascot('idle',CX-M/2,1340);
}
function nameLayout(name){
  const words=String(name||'').toUpperCase().split(/\\s+/).filter(Boolean);
  const maxText=240;
  const chunks=(token)=>token.split('-').map((part,i,all)=>i<all.length-1?part+'-':part).filter(Boolean);
  const candidates=[];
  if(words.length<=1) candidates.push(words.length?words:['?']);
  else{
    candidates.push([words.slice(0,-1).join(' '), words[words.length-1]]);
    candidates.push([...words.slice(0,-1).flatMap(chunks), ...chunks(words[words.length-1])]);
  }
  let best=null;
  for(const lines of candidates){
    const longest=Math.max(...lines.map(s=>s.length),1);
    const size=Math.min(26,Math.floor(maxText/longest));
    if(size<14) continue;
    const score=size*10-lines.length;
    if(!best||score>best.score) best={lines,size,score};
  }
  if(!best){
    const lines=candidates[candidates.length-1];
    const longest=Math.max(...lines.map(s=>s.length),1);
    best={lines,size:Math.max(12,Math.floor(maxText/longest))};
  }
  return {lines:best.lines,size:best.size};
}
function clueCard(i,t){
  const tops=[348,636,924];
  const start=T.clueStarts[i];
  const local=t-start;
  const current=T.clueStarts.findLastIndex(x=>t>=x);
  const opened=t>=start;
  const face=i<current||(opened&&local>=0.18);
  const rot=opened&&i===current&&local<0.36?(1-ease(local/0.36))*90:0;
  const cls=i===current?' gold':face?'':' dim';
  let body;
  if(!face) body='<div class="cardbody mid"><div class="qmark">?</div></div>';
  else{
    const full=D.clues[i];
    const typed=i<current?full.length:Math.min(full.length,Math.max(0,Math.floor((local-0.2)*34)));
    const label='CLUE '+(i+1);
    const diff=['HARD','MEDIUM','EASY'][i];
    body='<div class="cardhead"><span class="clue-k">'+label+'</span><span class="diff">'+diff+'</span></div>'
      +'<div class="cardbody">'+esc(full.slice(0,typed))+'</div>';
  }
  return '<div class="shell'+cls+'" style="top:'+tops[i]+'px;height:272px;transform:perspective(900px) rotateX('+rot+'deg)"><div class="inner">'+body+'</div></div>';
}
function clueScene(t){
  const current=Math.max(0,T.clueStarts.findLastIndex(x=>t>=x));
  const local=t-T.clueStarts[current];
  const span=(current<2?T.clueStarts[current+1]:T.lockStart)-T.clueStarts[current];
  const n=Math.max(0,Math.ceil(5*(1-local/span)));
  const mood=t>=T.lockStart-1.15?'sad':'thinking';
  let html=header(t);
  for(let i=0;i<3;i++) html+=clueCard(i,t);
  html+='<div class="shell" style="top:1212px;height:112px"><div class="inner timerin"><div class="timerrow"><span class="timerlabel">SHOT CLOCK</span><span class="timernum'+(n<=2?' warn':'')+'">'+n+'</span></div>'
    +'<div class="pips">'+[1,2,3,4,5].map(v=>'<i class="pip'+(v<=n?' on':'')+'"></i>').join('')+'</div></div></div>';
  html+=mascot(mood,CX-M/2,1340);
  return html;
}
function lockScene(t){
  const local=t-T.lockStart;
  const n=local<0.5?3:local<1?2:1;
  const pop=1+0.18*(1-ease((local%0.5)/0.22));
  return header(t)+'<div class="shell gold" style="top:400px;height:880px"><div class="inner lockin">'
    +'<div class="locktitle">LOCK IN<br>YOUR GUESS</div>'
    +'<div class="locknum" style="transform:scale('+pop+')">'+n+'</div>'
    +'</div></div>'+mascot(local<1?'surprised':'hype',CX-M/2,1340);
}
function endScene(t){
  const local=Math.max(0,t-T.endStart);
  const slam=1+0.55*Math.pow(1-ease(Math.min(1,local/0.32)),2);
  const layout=nameLayout(D.name);
  const platePadX=18, platePadY=16, plateLineGap=8, nameGap=36;
  const textW=Math.max(...layout.lines.map(s=>s.length))*layout.size;
  const plateW=textW+platePadX*2;
  const plateH=platePadY*2+layout.lines.length*layout.size+(layout.lines.length-1)*plateLineGap;
  const innerW=CW-12;
  const jw=D.headshot?380:440, jh=Math.round(jw*560/500);
  const shotW=D.headshot?120:0, gap=D.headshot?20:0;
  const group=shotW+gap+jw;
  const groupLeft=Math.round((innerW-group)/2);
  const jLeft=groupLeft+shotW+gap;
  const jTop=36;
  const numSize=String(D.jersey).length>1?128:156;
  const numBaseline=468;
  const numTop=jTop+Math.round((numBaseline-numSize)*(jh/560));
  const plateLeft=jLeft+Math.round((jw-plateW)/2);
  const plateTop=Math.max(16, numTop-nameGap-plateH);
  const name=layout.lines.map(line=>'<span style="font-size:'+layout.size+'px">'+esc(line)+'</span>').join('');
  const shot=D.headshot?'<img class="headshot" alt="" src="'+D.headshot+'" style="left:'+groupLeft+'px;top:'+(jTop+Math.round(jh/2)-60)+'px;width:120px;height:120px">':'';
  const ctaTop=jTop+jh+20;
  const ctaIn=ease((local-0.45)/0.3);
  const mascotTop=ctaTop+124;
  const shellH=mascotTop+M+32;
  const shellTop=Math.round((248+1488-shellH)/2);
  let bits='';
  if(local<1.35){
    for(let i=0;i<24;i++){
      const x=COL+24+((i*61)%680);
      const y=shellTop+80+((i*37)%160)+local*(200+(i%5)*30);
      if(y>1460) continue;
      const color=i%2?'#FFC83D':'#FF6A1A';
      bits+='<i class="bit" style="left:'+x+'px;top:'+y+'px;background:'+color+';opacity:'+(1-local/1.35)+';transform:rotate('+(i*28+local*240)+'deg)"></i>';
    }
  }
  return header(t)+'<div class="shell gold" style="top:'+shellTop+'px;height:'+shellH+'px"><div class="inner" style="position:relative">'
    +shot+jerseyBox(jLeft,jTop,jw,jh,false,numBaseline)
    +'<div class="plate" style="left:'+plateLeft+'px;top:'+plateTop+'px;width:'+plateW+'px;height:'+plateH+'px;transform:scale('+slam+');transform-origin:center center">'+name+'</div>'
    +'<div class="ctaBlock" style="top:'+ctaTop+'px;opacity:'+ctaIn+'">PLAY TODAY\\'S MYSTERY AT<span class="ctaUrl">PLAYFACTSOVERFEELINGS.COM</span></div>'
    +mascot('celebrate',Math.round((innerW-M)/2),mascotTop,M)
    +'</div></div>'
    +bits
    +(local<0.12?'<div class="flash" style="opacity:'+(1-local/0.12)*0.9+'"></div>':'');
}
window.draw=(t)=>{
  let html;
  if(t<T.hookEnd) html=hookScene(t);
  else if(t<T.lockStart) html=clueScene(t);
  else if(t<T.endStart) html=lockScene(t);
  else if(t<T.loopStart) html=endScene(t);
  else {
    const k=ease((t-T.loopStart)/(D.duration-T.loopStart));
    html='<div class="layer" style="opacity:'+(1-k)+'">'+endScene(T.loopStart)+'</div><div class="layer" style="opacity:'+k+'">'+hookScene(0)+'</div>';
  }
  document.getElementById('root').innerHTML='<main class="stage">'+html+'</main>';
};
</script></body></html>`;

const preview = (process.env.PREVIEW_TIMES ?? '').split(',').map((value) => value.trim()).filter(Boolean).map(Number).filter((value) => Number.isFinite(value));
const times = preview.length ? preview : Array.from({length: FPS * DURATION}, (_, index) => index / FPS);

const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  await page.setContent(html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  for (let index = 0; index < times.length; index++) {
    await page.evaluate((t) => window.draw(t), times[index]);
    const file = preview.length
      ? `preview-${String(times[index]).replace('.', '_')}.png`
      : `frame-${String(index + 1).padStart(4, '0')}.png`;
    await page.screenshot({path: path.join(frames, file)});
  }
} finally {
  await browser.close();
}

if (preview.length) {
  console.log(`Preview frames in ${frames}`);
  process.exit(0);
}

const speech = {
  hook: hook.toLowerCase().replace(/\b1\b/g, 'one').replace(/\b3\b/g, 'three').replace(/\b0\b/g, 'zero').replace(/90%/g, 'ninety percent'),
  clues: data.clues.map((clue) => clue.text),
  answer: data.player,
};
await fs.writeFile(path.join(out, 'speech.json'), JSON.stringify({...speech, timeline: TIMELINE, duration: DURATION, fps: FPS}, null, 2));
const py = process.env.PYTHON_EXE ?? (spawnSync('python', ['--version']).status === 0 ? 'python' : 'python3');
const enc = spawnSync(py, [path.join(project, 'encode.py'), out], {encoding: 'utf8', stdio: 'inherit'});
if (enc.status !== 0) throw Error('Video encoding failed');
await fs.writeFile(path.join(out, 'post.txt'), post.text);
await fs.writeFile(path.join(out, 'release-notes.md'), `**Answer: ${data.player}**\n\nThe name slams in on the jersey, and the same end card says to play today's mystery at PlayFactsOverFeelings.com.\n\nTwo downloads: **with music** and **no music** (add a trending sound in TikTok).\n\n### Title\n${post.title}\n\n### Caption\n${post.caption}\n`);
await fs.writeFile(path.join(out, 'sources.json'), JSON.stringify(data.sources ?? [], null, 2));
console.log(path.join(out, 'mystery-player.mp4'));
