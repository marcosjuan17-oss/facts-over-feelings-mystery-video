// Renders the daily Mystery Player video (1080x1920, 30 fps, 20.7 s).
// Big type inside the TikTok/Shorts safe area. The name and the site line
// are two short cards, then the picture cuts back to the opening frame. Usage:
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

// Safe column: x 190–890, y 268–1500. A 3% camera zoom plus the shake
// still clears the top 12%, bottom 20%, and right 15% of 1080×1920.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Press;src:url(${press}) format('truetype')}
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#07101f}
.stage{position:absolute;inset:0;overflow:hidden;background:#07101f;color:#f4f7fb;
  background-image:linear-gradient(rgba(255,200,61,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,200,61,.05) 1px,transparent 1px);
  background-size:24px 24px}
.cam{position:absolute;inset:0;transform-origin:540px 880px}
.crt{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.14) 0 1px,transparent 1px 4px);mix-blend-mode:multiply}
.track{position:absolute;left:190px;top:268px;width:700px;height:16px;display:flex;gap:4px}
.seg{flex:1;background:#152038}
.seg.on{background:#FFC83D}
.seg.lead{background:#FF6A1A}
.brandrow{position:absolute;left:190px;top:294px;width:700px;height:44px;display:flex;align-items:center;justify-content:space-between}
.brand{font:18px/18px Press;color:#f4f7fb}
.theme{font:18px/18px Press;color:#FFC83D}
.hookline{position:absolute;left:190px;top:348px;width:700px;height:200px;display:flex;align-items:center;justify-content:center;text-align:center;
  font:44px/64px Press;color:#f4f7fb}
.heroq{position:absolute;left:180px;top:600px;width:720px;height:720px;display:flex;align-items:center;justify-content:center;
  font:720px/720px Press;color:#FFC83D;transform-origin:center center}
.shell{position:absolute;left:190px;width:700px;padding:8px;background:#FF6A1A;
  clip-path:polygon(0 18px,18px 18px,18px 0,calc(100% - 18px) 0,calc(100% - 18px) 18px,100% 18px,100% calc(100% - 18px),calc(100% - 18px) calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,18px calc(100% - 18px),0 calc(100% - 18px))}
.shell.gold{background:#FFC83D}
.shell.dim{background:#31425f}
.tile{position:absolute;width:224px;padding:6px;background:#31425f;
  clip-path:polygon(0 14px,14px 14px,14px 0,calc(100% - 14px) 0,calc(100% - 14px) 14px,100% 14px,100% calc(100% - 14px),calc(100% - 14px) calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,14px calc(100% - 14px),0 calc(100% - 14px))}
.tile.on{background:#FFC83D}
.tile.done{background:#FF6A1A}
.inner{position:relative;height:100%;background:#0c1730;display:flex;flex-direction:column;
  clip-path:polygon(0 12px,12px 12px,12px 0,calc(100% - 12px) 0,calc(100% - 12px) 12px,100% 12px,100% calc(100% - 12px),calc(100% - 12px) calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,12px calc(100% - 12px),0 calc(100% - 12px))}
.tile .inner{align-items:center;justify-content:center}
.qmark{font:120px/120px Press;color:#FFC83D}
.tile .qmark{font:96px/96px Press}
.cardhead{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex:none}
.cardhead span{font:20px/20px Press}
.clue-k{color:#FF6A1A}
.diff{color:#FFC83D}
.cardbody{flex:1;display:flex;align-items:center;justify-content:center;padding:8px 28px 20px;text-align:center;font:46px/66px Press;color:#f4f7fb}
.timerrow{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 28px}
.timerlabel{font:20px/20px Press;color:#FFC83D}
.timernum{font:72px/72px Press;color:#FFC83D;min-width:80px;text-align:right}
.timernum.warn{color:#FF6A1A}
.pips{display:flex;gap:10px;height:36px;align-items:center;padding:0 28px}
.pip{flex:1;height:28px;background:#1c2944}
.pip.on{background:#FF6A1A}
.thinktitle{position:absolute;left:190px;top:360px;width:700px;text-align:center;font:58px/84px Press;color:#f4f7fb}
.thinknum{position:absolute;left:190px;top:560px;width:700px;height:640px;display:flex;align-items:center;justify-content:center;
  font:420px/420px Press;color:#FF6A1A;transform-origin:center center}
.jerseywrap{position:absolute}
.plate{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#FFC83D;color:#07101f;
  text-align:center;padding:16px 18px;
  clip-path:polygon(0 8px,8px 8px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 8px) calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 8px),0 calc(100% - 8px))}
.plate span{display:block;font-family:Press;line-height:1;height:1em;white-space:nowrap}
.ctaWrap{position:absolute;left:190px;width:700px;text-align:center}
.ctaWord{display:block;font:92px/108px Press;color:#FFC83D}
.ctaUrl{display:block;margin-top:16px;font:26px/40px Press;color:#FF6A1A}
.mascot{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;image-rendering:crisp-edges}
.bit{position:absolute}
.flash{position:absolute;inset:0;background:#fff;pointer-events:none}
</style></head><body><div id="root"></div><script>
const D=${payload};const T=D.T;
const CX=540;
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
const MOODS=['idle','thinking','surprised','pointing','celebrate','disappointed'];
function mascot(name,x,y,size,t){
  const i=MOODS.indexOf(name);
  const s=size||180;
  const bob=Math.sin((t||0)*3.4+i)*8;
  return '<div class="mascot" style="left:'+x+'px;top:'+(y+bob)+'px;width:'+s+'px;height:'+s+'px;background-image:url('+D.mascot+');background-size:'+(s*6)+'px '+s+'px;background-position:-'+(i*s)+'px 0"></div>';
}
function header(t){
  const n=Math.round(D.duration), filled=Math.round(n*Math.min(1,Math.max(0,t)/D.duration));
  let segs='';
  for(let i=0;i<n;i++) segs+='<i class="seg'+(i<filled?' on':'')+(i===filled-1?' lead':'')+'"></i>';
  return '<div class="crt"></div><div class="track">'+segs+'</div>'
    +'<div class="brandrow"><span class="brand">FACTS OVER FEELINGS</span><span class="theme">'+esc(D.theme)+'</span></div>';
}
function sparks(t){
  let h='';
  for(let i=0;i<16;i++){
    const sp=28+(i%5)*14;
    const x=196+((i*83+t*sp*20)%688);
    const y=300+((i*61+t*sp*26)%1120);
    const s=8+(i%3)*6;
    const color=i%2?'#FFC83D':'#FF6A1A';
    const o=(0.25+0.55*Math.abs(Math.sin(t*4+i))).toFixed(2);
    h+='<i class="bit" style="left:'+x.toFixed(1)+'px;top:'+y.toFixed(1)+'px;width:'+s+'px;height:'+s+'px;background:'+color+';opacity:'+o+'"></i>';
  }
  return h;
}
function shell(top,height,cls,inner,t){
  const pulse=0.3+0.35*Math.abs(Math.sin((t||0)*6));
  const glow=cls.indexOf('gold')>=0
    ? 'drop-shadow(0 0 '+(10+pulse*16).toFixed(0)+'px rgba(255,200,61,'+(0.35+pulse*0.4).toFixed(2)+'))'
    : 'drop-shadow(0 0 '+(8+pulse*12).toFixed(0)+'px rgba(255,106,26,'+(0.28+pulse*0.35).toFixed(2)+'))';
  return '<div class="shell '+cls+'" style="top:'+top+'px;height:'+height+'px;filter:'+glow+'"><div class="inner">'+inner+'</div></div>';
}
function cam(inner,time,start,len){
  const local=Math.max(0,time-start);
  const zoom=1+0.03*Math.min(1,local/Math.max(len,0.2));
  const breathe=0.004*Math.sin(time*5.2);
  let x=0,y=0;
  const kicks=T.clueStarts.concat([T.nameStart,T.ctaStart]);
  for(let k=0;k<kicks.length;k++){
    const d=time-kicks[k];
    if(d>=0&&d<0.26){
      const a=1-d/0.26;
      x+=Math.sin(d*95)*8*a;
      y+=Math.cos(d*75)*5*a;
    }
  }
  const z=(zoom+breathe).toFixed(4);
  return '<div class="cam" style="transform:translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+z+')">'+inner+sparks(time)+'</div>';
}
function flash(time,hits){
  for(let i=0;i<hits.length;i++){
    const d=time-hits[i];
    if(d>=0&&d<0.1) return '<div class="flash" style="opacity:'+((1-d/0.1)*0.75).toFixed(3)+'"></div>';
  }
  return '';
}
function hookScene(t){
  const pop=0.78+0.22*ease(Math.min(1,(t||0)/0.3));
  const push=1+0.05*ease(Math.min(1,(t||0)/T.hookEnd));
  const glow=(0.45+0.4*Math.abs(Math.sin((t||0)*6))).toFixed(2);
  const s=(pop*push).toFixed(3);
  // Press Start 2P keeps the "?" in the top-left of the em box. Nudge it
  // before the scale so the ink, not the empty em, sits on the frame center.
  return header(t)+'<div class="hookline" style="text-shadow:0 0 16px rgba(255,106,26,'+glow+')">'+esc(D.hook)+'</div>'
    +'<div class="heroq" style="transform:scale('+s+') translate(45px,45px);text-shadow:0 0 '+(16+glow*28)+'px rgba(255,200,61,'+glow+'),12px 12px 0 #FF6A1A">?</div>'
    +mascot('idle',CX-110,1288,220,t);
}
function clueScene(t){
  const current=Math.max(0,T.clueStarts.findLastIndex(x=>t>=x));
  const start=T.clueStarts[current];
  const next=current<2?T.clueStarts[current+1]:T.thinkStart;
  const local=t-start;
  const span=next-start;
  const left=Math.max(0,span-local);
  const n=Math.max(1,Math.ceil(left));
  const face=local>=0.16;
  const rot=local<0.34?(1-ease(local/0.34))*90:0;
  let tiles='';
  for(let i=0;i<3;i++){
    const on=i===current, done=i<current;
    const cls=on?' on':done?' done':'';
    const mark=done?'<span class="qmark" style="font-size:72px;color:#07101f">'+(i+1)+'</span>':'<span class="qmark">?</span>';
    const grow=on?1+0.04*Math.sin(t*8):1;
    tiles+='<div class="tile'+cls+'" style="left:'+(190+i*240)+'px;top:344px;width:220px;height:148px;transform:scale('+grow.toFixed(3)+');transform-origin:center center"><div class="inner">'+mark+'</div></div>';
  }
  let body;
  if(!face) body='<div class="cardbody"><span class="qmark" style="font-size:200px">?</span></div>';
  else {
    const full=D.clues[current];
    const typed=Math.min(full.length,Math.max(0,Math.floor((local-0.18)*42)));
    body='<div class="cardhead"><span class="clue-k">CLUE '+(current+1)+'</span><span class="diff">'+['HARD','MEDIUM','EASY'][current]+'</span></div>'
      +'<div class="cardbody">'+esc(full.slice(0,typed))+'</div>';
  }
  const pips=[1,2,3,4,5,6].map(v=>'<i class="pip'+(v<=n?' on':'')+'"></i>').join('');
  const mood=local<0.55?'surprised':'thinking';
  return header(t)+tiles
    +shell(508,430,face?'gold':'',body,t)
    +shell(954,136,'', '<div class="timerrow"><span class="timerlabel">SHOT CLOCK</span><span class="timernum'+(n<=2?' warn':'')+'">'+n+'</span></div><div class="pips">'+pips+'</div>', t)
    +mascot(mood,CX-180,1104,360,t);
}
function thinkScene(t){
  const local=t-T.thinkStart;
  const n=local<0.53?3:local<1.06?2:1;
  const pop=1+0.22*(1-ease((local%0.53)/0.18));
  const nx=n===1?1:27, ny=27;
  return header(t)+'<div class="thinktitle">LOCK IT<br>IN</div>'
    +'<div class="thinknum" style="transform:scale('+pop.toFixed(3)+') translate('+nx+'px,'+ny+'px)">'+n+'</div>'
    +mascot('surprised',CX-160,1168,320,t);
}
function nameLayout(name){
  const words=String(name||'').toUpperCase().split(/\s+/).filter(Boolean);
  const maxText=500;
  const chunks=(token)=>token.split('-').map((part,i,all)=>i<all.length-1?part+'-':part).filter(Boolean);
  const candidates=[];
  if(words.length<=1) candidates.push(words.length?words:['?']);
  else {
    candidates.push([words.slice(0,-1).join(' '), words[words.length-1]]);
    candidates.push(words.slice(0,-1).flatMap(chunks).concat(chunks(words[words.length-1])));
  }
  let best=null;
  for(let c=0;c<candidates.length;c++){
    const lines=candidates[c];
    const longest=Math.max.apply(null,lines.map(s=>s.length).concat([1]));
    const size=Math.min(60,Math.floor(maxText/longest));
    if(size<16) continue;
    const score=size*10-lines.length;
    if(!best||score>best.score) best={lines,size,score};
  }
  if(!best){
    const lines=candidates[candidates.length-1];
    const longest=Math.max.apply(null,lines.map(s=>s.length).concat([1]));
    best={lines,size:Math.max(14,Math.floor(maxText/longest))};
  }
  return best;
}
function jerseySvg(numBaseline){
  const numSize=String(D.jersey).length>1?140:180;
  return '<svg viewBox="0 0 500 560" width="100%" height="100%">'
    +'<path d="M150 28 L205 28 Q250 92 295 28 L350 28 L362 128 Q388 156 438 168 L446 532 L54 532 L62 168 Q112 156 138 128 Z" fill="'+D.color+'" opacity=".35"/>'
    +'<path d="M150 28 L205 28 Q250 92 295 28 L350 28 L362 128 Q388 156 438 168 L446 532 L54 532 L62 168 Q112 156 138 128 Z" fill="#0c1730" stroke="'+D.color+'" stroke-width="12"/>'
    +'<text x="250" y="'+(numBaseline||470)+'" text-anchor="middle" font-family="Press" font-size="'+numSize+'" fill="'+D.color+'" stroke="#07101f" stroke-width="10" paint-order="stroke">'+esc(D.jersey)+'</text>'
    +'</svg>';
}
function nameScene(t){
  const local=Math.max(0,t-T.nameStart);
  const slam=1+0.5*Math.pow(1-ease(Math.min(1,local/0.24)),2);
  const layout=nameLayout(D.name);
  const plateW=Math.max.apply(null,layout.lines.map(s=>s.length))*layout.size+36;
  const plateH=32+layout.lines.length*layout.size+(layout.lines.length-1)*8;
  const jw=640, jh=Math.round(jw*560/500);
  const jLeft=Math.round((684-jw)/2);
  const jTop=36;
  const numSize=String(D.jersey).length>1?140:180;
  const numBaseline=468;
  const numTop=jTop+Math.round((numBaseline-numSize)*(jh/560));
  const plateTop=Math.max(16,numTop-32-plateH);
  const plateLeft=jLeft+Math.round((jw-plateW)/2);
  const name=layout.lines.map(line=>'<span style="font-size:'+layout.size+'px">'+esc(line)+'</span>').join('');
  const shellH=jTop+jh+36;
  const shellTop=352;
  return header(t)+shell(shellTop,shellH,'gold',
    '<div class="jerseywrap" style="left:'+jLeft+'px;top:'+jTop+'px;width:'+jw+'px;height:'+jh+'px">'+jerseySvg(numBaseline)+'</div>'
    +'<div class="plate" style="left:'+plateLeft+'px;top:'+plateTop+'px;width:'+plateW+'px;height:'+plateH+'px;transform:scale('+slam.toFixed(3)+');transform-origin:center center">'+name+'</div>',
    t)+mascot('celebrate',CX-165,shellTop+shellH+8,330,t);
}
function ctaScene(t){
  const local=Math.max(0,t-T.ctaStart);
  const pop=0.86+0.14*ease(Math.min(1,local/0.22));
  const glow=(0.4+0.5*Math.abs(Math.sin(local*7))).toFixed(2);
  return header(t)+'<div class="ctaWrap" style="top:390px;transform:scale('+pop.toFixed(3)+');transform-origin:center top">'
    +'<span class="ctaWord" style="text-shadow:0 0 18px rgba(255,200,61,'+glow+')">PLAY</span>'
    +'<span class="ctaWord">TODAY\\'S</span>'
    +'<span class="ctaWord">MYSTERY</span>'
    +'<span class="ctaWord">AT</span>'
    +'<span class="ctaUrl">PLAYFACTSOVERFEELINGS.COM</span></div>'
    +mascot('pointing',CX-250,920,500,t);
}
window.draw=(t)=>{
  const time=t>=T.loopStart?0:t;
  let html,start,len,hits;
  if(time<T.hookEnd){html=hookScene(time);start=0;len=T.hookEnd;hits=[];}
  else if(time<T.thinkStart){
    const i=Math.max(0,T.clueStarts.findLastIndex(x=>time>=x));
    html=clueScene(time);start=T.clueStarts[i];len=(i<2?T.clueStarts[i+1]:T.thinkStart)-start;hits=T.clueStarts;
  } else if(time<T.nameStart){html=thinkScene(time);start=T.thinkStart;len=T.nameStart-T.thinkStart;hits=[T.thinkStart];}
  else if(time<T.ctaStart){html=nameScene(time);start=T.nameStart;len=T.ctaStart-T.nameStart;hits=[T.nameStart];}
  else {html=ctaScene(time);start=T.ctaStart;len=T.loopStart-T.ctaStart;hits=[T.ctaStart];}
  document.getElementById('root').innerHTML='<main class="stage">'+cam(html,time,start,len)+flash(time,hits)+'</main>';
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
await fs.writeFile(path.join(out, 'release-notes.md'), `**Answer: ${data.player}**\n\nThe name slams in on the jersey, then the card says to play today's mystery at PlayFactsOverFeelings.com. The picture cuts back to the opening frame.\n\nTwo downloads: **with music** and **no music** (add a trending sound in TikTok).\n\n### Title\n${post.title}\n\n### Caption\n${post.caption}\n`);
await fs.writeFile(path.join(out, 'sources.json'), JSON.stringify(data.sources ?? [], null, 2));
console.log(path.join(out, 'mystery-player.mp4'));
