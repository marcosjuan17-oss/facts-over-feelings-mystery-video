import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

const project = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const input = path.resolve(process.argv[2] ?? path.join(project, 'player.json'));
const data = JSON.parse(await fs.readFile(input, 'utf8'));
if (!data.player || !Array.isArray(data.clues) || data.clues.length !== 3) throw Error('Need a player and exactly three clues');
if (data.player.length > 24 || data.clues.some((x) => typeof x !== 'string' || x.length > 56)) throw Error('Player name max 24 characters; each clue max 56');

const slug = (data.slug ?? data.player.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/[^a-z0-9-]/g, '');
const out = path.resolve(process.argv[3] ?? path.join(project, 'renders', slug));
const frames = path.join(out, 'frames');
await fs.mkdir(frames, {recursive: true});

const asData = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const background = await asData(path.join(project, 'arena-background-v2.png'), 'image/png');
const press = await asData(path.join(project, 'PressStart2P-Regular.ttf'), 'font/ttf');
const silk = await asData(path.join(project, 'Silkscreen-Regular.ttf'), 'font/ttf');
const mascot = {};
for (const state of ['thinking', 'surprised', 'nervous', 'celebration']) {
  mascot[state] = [];
  for (let i = 0; i < 9; i++) mascot[state].push(await asData(path.join(project, 'assets', 'mascot', `${state}-${String(i).padStart(2, '0')}.png`), 'image/png'));
}

const payload = JSON.stringify({player: data.player.toUpperCase(), clues: data.clues.map((c) => c.toUpperCase()), background, mascot});
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Press;src:url(${press}) format('truetype')}@font-face{font-family:Silk;src:url(${silk}) format('truetype')}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#03060d}.stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:#040711 center/cover no-repeat;color:#f4f7fb}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,4,11,.08),rgba(1,4,11,.18) 38%,rgba(1,4,11,.03))}.pixel{font-family:Press}.silk{font-family:Silk}.toptrack{position:absolute;left:60px;top:52px;width:960px;height:10px;background:#263149}.topfill{height:100%;background:#ff561b}.brand{position:absolute;left:70px;top:84px;font:31px Press}.mode{position:absolute;left:70px;top:154px;font:18px Silk;color:#ff6428;letter-spacing:2px}.prompt{position:absolute;left:70px;top:210px;width:700px;font:46px/1.06 Press}.sub{font:17px Silk;color:#9cabc2;letter-spacing:2px}.hook{position:absolute;left:70px;top:575px;width:940px;text-align:center;font:62px/1.38 Press}.hooksub{position:absolute;left:70px;top:825px;width:940px;text-align:center;font:29px Press;color:#ff6125}.gamestart{position:absolute;left:70px;top:900px;width:940px;text-align:center;font:23px Silk;color:#24d8ff;letter-spacing:3px}.hookmark{position:absolute;left:390px;top:1020px;width:300px;text-align:center;font:170px Press;color:#ff5b1d;text-shadow:0 0 18px rgba(255,91,29,.65)}.card{position:absolute;left:70px;width:760px;height:220px;border:2px solid #29354b;border-radius:10px;background:rgba(5,10,22,.93)}.card.active{border-color:#ff6a27}.status{position:absolute;left:35px;top:27px;font:20px Silk;color:#ff6428;letter-spacing:2px}.status.decode{color:#26d9ff}.cluetext{position:absolute;left:35px;top:88px;width:520px;font:27px/1.35 Press}.dots{position:absolute;left:35px;top:72px;color:#ff5b1d;font:48px Silk;letter-spacing:5px}.avatar{position:absolute;right:0;top:12px;width:196px;height:196px;object-fit:contain;image-rendering:pixelated}.timer{position:absolute;left:850px;width:170px;height:220px;border:3px solid #ff6428;border-radius:12px;background:#080d19;text-align:center}.timerlabel{position:absolute;left:0;top:27px;width:100%;font:17px Silk;color:#9cabc2;letter-spacing:2px}.timernum{position:absolute;left:0;top:67px;width:100%;font:68px Press;text-align:center}.timernum.warning{color:#ff5b1d}.pips{position:absolute;left:16px;right:16px;bottom:30px;display:flex;gap:7px}.pip{height:13px;flex:1;border-radius:4px;background:#283249}.pip.on{background:#ff5b1d}.lock{position:absolute;left:70px;top:360px;width:940px;height:900px;border:4px solid #ff6428;border-radius:12px;background:rgba(3,7,16,.96);text-align:center}.locktitle{margin-top:82px;font:49px/1.35 Press}.locknum{margin-top:58px;font:180px Press;color:#ff5b1d}.locksite{margin-top:95px;font:28px Silk;color:#26d9ff;letter-spacing:2px}.reveal{position:absolute;left:70px;top:360px;width:940px;height:1420px;border:3px solid #ff6428;border-radius:12px;background:rgba(3,7,16,.95);text-align:center}.revealcap{margin-top:55px;font:29px Press}.player{margin:90px auto 0;width:860px;font:54px/1.28 Press;color:#ff5b1d}.celebrate{width:235px;height:235px;object-fit:contain;image-rendering:pixelated;margin-top:5px}.site{margin-top:0;font:30px Silk;color:#26d9ff;letter-spacing:2px}.recap{margin:35px auto 0;width:820px;text-align:left}.recaprow{display:flex;gap:22px;margin:0 0 26px;font:21px/1.25 Press}.recaprow b{color:#ff6428}.comment{margin:52px auto 0;font:26px Press;color:#ff6428;letter-spacing:1px}.particle{position:absolute;width:8px;height:8px;background:#ff6428}.flash{position:absolute;inset:0;background:white}.glitch{filter:contrast(1.14) saturate(1.18)}
</style></head><body><div id="root"></div><script>
const D=${payload};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=(state,t)=>D.mascot[state][Math.floor(t*11)%9];
const header=(t)=>'<div class="shade"></div><div class="toptrack"><div class="topfill" style="width:'+Math.max(16,960*t/23)+'px"></div></div><div class="brand">FACTS OVER FEELINGS</div><div class="mode">MYSTERY PLAYER // ARCADE MODE</div>';
const timer=(y,n)=>'<div class="timer" style="top:'+y+'px"><div class="timerlabel">SHOT CLOCK</div><div class="timernum '+(n<=2?'warning':'')+'">'+n+'</div><div class="pips">'+[5,4,3,2,1].map(v=>'<i class="pip '+(v<=n?'on':'')+'"></i>').join('')+'</div></div>';
const card=(i,y,state,local,active)=>{let text='',status='CLUE '+(i+1)+' // REVEALED',extra='';if(state==='decode'){status='CLUE '+(i+1)+' // DECODING';extra='<div class="dots">•••</div>'}else if(state==='typing'){const full=D.clues[i];text=esc(full.slice(0,Math.floor((local-.72)*38)))}else{text=esc(D.clues[i])}const mood=['thinking','surprised','nervous'][i];return '<div class="card '+(active?'active':'')+'" style="top:'+y+'px"><div class="status '+(state==='decode'?'decode':'')+'">'+status+'</div><div class="cluetext">'+text+'</div>'+extra+'<img class="avatar" src="'+avatar(mood,local)+'"></div>'};
function game(t){const starts=[1.2,6.25,11.3];let current=starts.findLastIndex(x=>t>=x);current=Math.max(0,current);let body='<div class="prompt">WHO IS THE<br>PLAYER?<div class="sub">READ THE CLUES / BEAT THE CLOCK</div></div>';for(let i=0;i<=current;i++){const local=t-starts[i];const state=i<current?'revealed':local<.72?'decode':local<1.55?'typing':'revealed';body+=card(i,390+i*260,state,Math.max(0,local),i===current)}const local=t-starts[current];const n=Math.max(1,5-Math.floor(Math.max(0,local)));body+=timer(390+current*260,n);return body}
function lock(t){const local=t-16.3;const n=local<.5?3:local<1?2:1;return '<div class="lock"><div class="locktitle">LOCK IN<br>YOUR GUESS</div><div class="locknum">'+n+'</div><div class="locksite">PLAYFACTSOVERFEELINGS.COM</div></div>'}
function reveal(t){const local=t-17.8;const nameSize=D.player.length>16?43:54;let particles='';for(let i=0;i<26;i++){const a=i*2.399,dist=Math.min(240,local*85+i*2),x=540+Math.cos(a)*dist,y=690+Math.sin(a)*dist;particles+='<i class="particle" style="left:'+x+'px;top:'+y+'px;opacity:'+Math.max(0,1-local/4)+'"></i>'}return '<div class="reveal"><div class="revealcap">THE PLAYER IS</div><div class="player" style="font-size:'+nameSize+'px">'+esc(D.player)+'</div><img class="celebrate" src="'+avatar('celebration',local)+'"><div class="site">PLAYFACTSOVERFEELINGS.COM</div><div class="recap">'+D.clues.map((c,i)=>'<div class="recaprow"><b>0'+(i+1)+'</b><span>'+esc(c)+'</span></div>').join('')+'</div><div class="comment">LEAVE A COMMENT</div></div>'+particles+(local<.12?'<div class="flash" style="opacity:'+(1-local/.12)+'"></div>':'')}
window.draw=(t)=>{let content='';if(t<.95)content='<div class="hook">GUESS THE NBA<br>PLAYER</div><div class="hooksub">3 CLUES. ONE LEGEND.</div><div class="gamestart">GAME START</div><div class="hookmark">?</div>';else if(t<1.2)content='<div class="prompt">WHO IS THE<br>PLAYER?<div class="sub">READ THE CLUES / BEAT THE CLOCK</div></div>';else if(t<16.3)content=game(t);else if(t<17.8)content=lock(t);else content=reveal(t);document.getElementById('root').innerHTML='<main class="stage '+(t>17.75&&t<18.05?'glitch':'')+'" style="background-image:url('+D.background+')">'+header(t)+content+'</main>'};
</script></body></html>`;

const fps = 15;
const totalFrames = 23 * fps;
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  await page.setContent(html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  for (let frame = 0; frame < totalFrames; frame++) {
    await page.evaluate((t) => window.draw(t), frame / fps);
    await page.screenshot({path: path.join(frames, `frame-${String(frame + 1).padStart(4, '0')}.png`)});
  }
} finally {
  await browser.close();
}

const py = process.env.PYTHON_EXE ?? 'python';
const enc = spawnSync(py, [path.join(project, 'encode.py'), out, input], {encoding: 'utf8', stdio: 'inherit'});
if (enc.status !== 0) throw Error('Video encoding failed');
const edition = data.date ? ` — ${data.date}` : '';
const caption = `How many clues did you need? Drop your guess before the reveal.\n\nPlay the daily mystery at PlayFactsOverFeelings.com\n\n#NBATrivia #BasketballTrivia #GuessThePlayer #NBAHistory #FactsOverFeelings`;
await fs.writeFile(path.join(out, 'post.txt'), `TITLE\nCan You Guess This NBA Legend in 3 Clues?${edition}\n\nCAPTION\n${caption}\n`);
await fs.writeFile(path.join(out, 'sources.json'), JSON.stringify(data.sources ?? [], null, 2));
console.log(path.join(out, 'mystery-player.mp4'));
