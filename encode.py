import subprocess, sys
from pathlib import Path

import imageio_ffmpeg

out=Path(sys.argv[1]).resolve()
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
cmd=[ffmpeg,'-y','-framerate','1/5','-start_number','1','-i',str(out/'slide-%d.png'),
     '-vf','fps=30,format=yuv420p','-t','25','-an','-c:v','libx264','-crf','18',
     '-preset','medium','-movflags','+faststart',str(out/'mystery-player.mp4')]
subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
