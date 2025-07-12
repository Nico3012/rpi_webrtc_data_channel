ffmpeg \
-i /dev/video0 \ # use default webcam
-c:v vp8 \ # set video codec to vp8
-video_size 640x480 \
-framerate 30 \
-b:v 2M \
-an \ # disable audio
-f ivf pipe:1 # pipe out as ivf

# for testing: replace pipe:1 with output.ivf
