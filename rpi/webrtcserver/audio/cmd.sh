ffmpeg \
-f pulse -i default \ # use linux pulse audio with default device
-c:a libopus \ # set audio codec to opus
-page_duration 20000 \
-vn \ # disable video
-f ogg pipe:1 # pipe out as ogg

# for testing: replace pipe:1 with output.ogg
