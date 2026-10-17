// Optional: uploads today's video to YouTube as a Short. Runs only when the
// YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN secrets exist (see README).
// Usage: node upload-youtube.mjs <render-dir>
import fs from 'node:fs/promises';
import path from 'node:path';

const {YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN} = process.env;
const privacy = process.env.YOUTUBE_PRIVACY || 'public';
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
  console.log('YouTube secrets are not set; skipping the YouTube upload.');
  process.exit(0);
}
const dir = path.resolve(process.argv[2]);
const selected = JSON.parse(await fs.readFile('selected.json', 'utf8'));
const video = await fs.readFile(path.join(dir, 'mystery-player.mp4'));

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: new URLSearchParams({client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: 'refresh_token'}),
});
const token = await tokenResponse.json();
if (!tokenResponse.ok) throw Error(`YouTube sign-in failed: ${token.error_description || token.error}`);

const metadata = {
  snippet: {
    title: `${selected.title} #Shorts`.slice(0, 100),
    description: selected.post.caption,
    tags: ['NBA', 'NBA trivia', 'guess the player', 'basketball trivia', 'UknowBall', 'Facts Over Feelings'],
    categoryId: '17',
  },
  status: {privacyStatus: privacy, selfDeclaredMadeForKids: false},
};
const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token.access_token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': 'video/mp4',
    'X-Upload-Content-Length': String(video.length),
  },
  body: JSON.stringify(metadata),
});
if (!start.ok) throw Error(`YouTube upload could not start (${start.status}): ${await start.text()}`);
const upload = await fetch(start.headers.get('location'), {method: 'PUT', headers: {'Content-Type': 'video/mp4'}, body: video});
const result = await upload.json();
if (!upload.ok) throw Error(`YouTube upload failed (${upload.status}): ${JSON.stringify(result.error ?? result)}`);
console.log(`Uploaded to YouTube (${privacy}): https://youtube.com/shorts/${result.id}`);
