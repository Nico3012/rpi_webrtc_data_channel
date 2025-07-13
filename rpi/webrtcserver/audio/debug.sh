ffmpeg \
-f alsa -i plughw:3,0 \
-c:a libopus \
-frame_duration 20 \
-application voip \
-b:a 48k \
-vn \
-f ogg \
debug.ogg
