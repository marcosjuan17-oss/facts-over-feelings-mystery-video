import subprocess, sys
from pathlib import Path

import imageio_ffmpeg

out=Path(sys.argv[1]).resolve()
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
durations=[3,5,5,5,5]
sequence=[]
for number,seconds in enumerate(durations,1):
    sequence.extend([f"file 'slide-{number}.png'",f'duration {seconds}'])
sequence.append("file 'slide-5.png'")
(out/'sequence.txt').write_text('\n'.join(sequence)+'\n',encoding='utf-8')
cmd=[ffmpeg,'-y','-f','concat','-safe','0','-i','sequence.txt',
     '-vf','fps=30,format=yuv420p','-t',str(sum(durations)),'-an','-c:v','libx264','-crf','18',
     '-preset','medium','-movflags','+faststart','mystery-player.mp4']
subprocess.run(cmd,cwd=out,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
