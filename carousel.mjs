// Renders the Depixelate the Player carousel (7 PNGs, 1080×1920).
// Usage: node carousel.mjs [selected.json] [output-dir]
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {checkEntry} from './lib/clues.mjs';
import {carouselCaption, carouselSlides} from './lib/carousel.mjs';

const project = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const input = path.resolve(process.argv[2] ?? path.join(project, 'player.json'));
const data = JSON.parse(await fs.readFile(input, 'utf8'));
const problems = checkEntry(data);
if (problems.length) throw Error(`Cannot render this carousel: ${problems.join('; ')}`);

const date = data.date ?? new Date().toISOString().slice(0, 10);
const slides = carouselSlides(data, date);
const caption = carouselCaption(date);
const out = path.resolve(process.argv[3] ?? path.join(project, 'renders', data.slug));
await fs.mkdir(out, {recursive: true});

const asData = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const press = await asData(path.join(project, 'PressStart2P-Regular.ttf'), 'font/ttf');
const mascot = await asData(path.join(project, 'assets', 'mascot.png'), 'image/png');
const payload = JSON.stringify({slides, mascot}).replaceAll('</', '<\\/');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Press;src:url(${press}) format('truetype')}
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#07101f}
.stage{position:absolute;inset:0;overflow:hidden;background:#07101f;color:#f4f7fb;
  background-image:linear-gradient(rgba(255,200,61,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,200,61,.05) 1px,transparent 1px);
  background-size:24px 24px}
.crt{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.14) 0 1px,transparent 1px 4px);mix-blend-mode:multiply}
.brandrow{position:absolute;left:190px;top:280px;width:700px;height:44px;display:flex;align-items:center;justify-content:space-between}
.brand{font:18px/18px Press;color:#f4f7fb}
.theme{font:18px/18px Press;color:#FFC83D}
.block{position:absolute;left:190px;width:700px;text-align:center}
.h1{display:block;font:64px/84px Press;color:#FFC83D}
.h2{display:block;font:48px/68px Press;color:#f4f7fb}
.kicker{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:18px;font:72px/72px Press;color:#FF6A1A}
.sub{display:block;margin-top:16px;font:36px/52px Press;color:#f4f7fb}
.shell{position:absolute;left:190px;width:700px;padding:8px;background:#FFC83D;
  clip-path:polygon(0 18px,18px 18px,18px 0,calc(100% - 18px) 0,calc(100% - 18px) 18px,100% 18px,100% calc(100% - 18px),calc(100% - 18px) calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,18px calc(100% - 18px),0 calc(100% - 18px))}
.inner{height:100%;background:#0c1730;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px 36px;
  font:40px/58px Press;color:#f4f7fb;
  clip-path:polygon(0 12px,12px 12px,12px 0,calc(100% - 12px) 0,calc(100% - 12px) 12px,100% 12px,100% calc(100% - 12px),calc(100% - 12px) calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,12px calc(100% - 12px),0 calc(100% - 12px))}
.jerseybox{position:absolute;left:250px;width:580px}
.jerseybox img{width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.mark{position:absolute;left:0;right:0;top:150px;text-align:center;font:200px/200px Press;color:#FFC83D;text-shadow:10px 10px 0 #FF6A1A}
.num{position:absolute;left:0;right:0;text-align:center;font:150px/150px Press;color:#f4f7fb;text-shadow:8px 8px 0 #07101f}
.scout{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;image-rendering:crisp-edges}
.ctaLines{position:absolute;left:190px;width:700px;text-align:center}
.ctaLines span{display:block}
</style></head><body><div id="root"></div><script>
const D=${payload};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function jerseySvg(color){
  const stroke=color||'#FFC83D';
  const fill=color||'#0c1730';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 560">'
    +'<path d="M150 28 L205 28 Q250 92 295 28 L350 28 L362 128 Q388 156 438 168 L446 532 L54 532 L62 168 Q112 156 138 128 Z" fill="'+fill+'" stroke="'+stroke+'" stroke-width="16"/>'
    +'</svg>';
}
function pixelate(ctx,w,h,block){
  const src=ctx.getImageData(0,0,w,h);
  const out=ctx.createImageData(w,h);
  const s=src.data, d=out.data;
  for(let by=0;by<h;by+=block){
    for(let bx=0;bx<w;bx+=block){
      let r=0,g=0,b=0,a=0,n=0;
      const bh=Math.min(block,h-by), bw=Math.min(block,w-bx);
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){
        const i=((by+y)*w+(bx+x))*4;
        if(s[i+3]<20) continue;
        r+=s[i]; g+=s[i+1]; b+=s[i+2]; a+=s[i+3]; n++;
      }
      if(!n) continue;
      r=Math.round(r/n); g=Math.round(g/n); b=Math.round(b/n); a=Math.round(a/n);
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){
        const i=((by+y)*w+(bx+x))*4;
        d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=a;
      }
    }
  }
  ctx.putImageData(out,0,0);
}
function raster(svg,pixel){
  return new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=500; canvas.height=560;
      const ctx=canvas.getContext('2d');
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img,0,0,500,560);
      if(pixel>1) pixelate(ctx,500,560,pixel);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
const ball='<svg width="64" height="64" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="none"/><rect x="4" y="1" width="8" height="2" fill="#FF6A1A"/><rect x="2" y="3" width="12" height="2" fill="#FF6A1A"/><rect x="1" y="5" width="14" height="6" fill="#FF6A1A"/><rect x="2" y="11" width="12" height="2" fill="#FF6A1A"/><rect x="4" y="13" width="8" height="2" fill="#FF6A1A"/><rect x="7" y="1" width="2" height="14" fill="#07101f"/><rect x="2" y="7" width="12" height="2" fill="#07101f"/></svg>';
function header(){
  return '<div class="crt"></div><div class="brandrow"><span class="brand">FACTS OVER FEELINGS</span><span class="theme">DEPIXELATE</span></div>';
}
window.draw=async (index)=>{
  const s=D.slides[index];
  let body=header();
  if(s.scout){
    body+='<div class="ctaLines" style="top:360px">'
      +'<span class="h1">COMMENT</span><span class="h1">YOUR GUESS</span>'
      +'<span class="sub" style="margin-top:28px">ANSWER + PLAY TODAY\\'S</span>'
      +'<span class="sub">AT</span>'
      +'<span class="sub" style="color:#FF6A1A;font-size:28px;line-height:44px;margin-top:12px">PLAYFACTSOVERFEELINGS.COM</span></div>'
      +'<div class="scout" style="left:250px;top:860px;width:580px;height:580px;background-image:url('+D.mascot+');background-size:'+(580*6)+'px 580px;background-position:-'+(3*580)+'px 0"></div>';
  } else {
    const top=s.clue?340:360;
    body+='<div class="block" style="top:'+top+'px">'
      +s.headline.map((line,i)=>'<span class="'+(i?'h2':'h1')+'">'+esc(line)+'</span>').join('')
      +(s.kicker?'<span class="kicker">'+esc(s.kicker)+ball+'</span>':'')
      +(s.sub && !s.clue?'<span class="sub">'+esc(s.sub)+'</span>':'')
      +'</div>';
    if(s.clue){
      body+='<div class="shell" style="top:560px;height:300px"><div class="inner">'+esc(s.clue)+'</div></div>';
    }
    const url=await raster(jerseySvg(s.color), s.pixel);
    const jerseyTop=s.clue?900:760;
    const jerseyH=s.clue?560:680;
    body+='<div class="jerseybox" style="top:'+jerseyTop+'px;height:'+jerseyH+'px"><img alt="" src="'+url+'">';
    if(!s.clue) body+='<div class="mark" style="top:'+Math.round(jerseyH*0.28)+'px">?</div>';
    if(s.showNumber) body+='<div class="num" style="top:'+Math.round(jerseyH*0.42)+'px;font-size:'+(String(s.jersey).length>1?110:150)+'px">'+esc(s.jersey)+'</div>';
    body+='</div>';
  }
  document.getElementById('root').innerHTML='<main class="stage">'+body+'</main>';
};
</script></body></html>`;

const browser = await chromium.launch({headless: true});
const files = [];
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  await page.setContent(html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  for (let index = 0; index < slides.length; index++) {
    await page.evaluate((i) => window.draw(i), index);
    const file = path.join(out, `carousel-${slides[index].id}.png`);
    await page.screenshot({path: file});
    files.push(file);
  }
} finally {
  await browser.close();
}

const captionFile = path.join(out, 'carousel-caption.txt');
await fs.writeFile(captionFile, `${caption}\n`);
const zipFile = path.join(out, 'depixelate-carousel.zip');
const py = process.env.PYTHON_EXE ?? (spawnSync('python', ['--version']).status === 0 ? 'python' : 'python3');
const zipped = spawnSync(py, ['-c', `
import sys, zipfile
from pathlib import Path
archive = zipfile.ZipFile(sys.argv[1], 'w', compression=zipfile.ZIP_DEFLATED)
for name in sys.argv[2:]:
    archive.write(name, arcname=Path(name).name)
archive.close()
`, zipFile, captionFile, ...files], {encoding: 'utf8'});
if (zipped.status !== 0) throw Error(zipped.stderr || 'Could not zip the carousel');

const notes = path.join(out, 'release-notes.md');
let existing = '';
try { existing = await fs.readFile(notes, 'utf8'); } catch { existing = ''; }
const section = `\n### Depixelate carousel\nSeven 1080×1920 slides, zipped and as separate PNGs. The caption does not include the answer. Comment a guess, then play today's mystery at PlayFactsOverFeelings.com.\n`;
if (!existing.includes('### Depixelate carousel')) {
  await fs.writeFile(notes, `${existing.trim()}\n${section}`);
}
console.log(zipFile);
