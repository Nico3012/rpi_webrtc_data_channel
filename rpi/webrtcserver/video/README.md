# How to find camera name on Windows
`ffmpeg -list_devices true -f dshow -i dummy` Insert the name into the `video=<camera name>`

# Generate video.webm from camera on WINDOWS ARBEIT
`ffmpeg -f dshow -i "video=HP HD Camera" -c:v libvpx -deadline realtime -cpu-used 8 -video_size 640x480 -framerate 30 -b:v 1.5M -an video.webm`

# Generate video.webm from file
Download https://download.samplelib.com/mp4/sample-5s.mp4
`ffmpeg -i sample-5s.mp4 -c:v libvpx -deadline realtime -cpu-used 8 -video_size 640x480 -framerate 30 -b:v 1.5M -an video.webm`
