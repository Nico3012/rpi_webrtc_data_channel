ffmpeg -y \
-f alsa \
-channels 1 \
-ac 1 \
-ar 48000 \
-i hw:CARD=U0x46d0x81b,DEV=0 \
-c:a libopus \
-application lowdelay \
-b:a 128k \
-vbr on \
-frame_duration 20 \
-f ogg \
pipe:1
