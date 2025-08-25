# How to find microphone hardware device on linux
![List of CAPTURE Hardware Devices](plughw.png)
`ffmpeg -f alsa -i plughw:3,0` where the 3 is the `card` id and the 0 is the `device` id like on the image

# How to find microphone name on Windows
`ffmpeg -list_devices true -f dshow -i dummy` Insert the name into the `audio=<camera name>`

# Generate audio.ogg from camera on WINDOWS ARBEIT
`ffmpeg -f dshow -i "audio=Mikrofon (Realtek(R) Audio)" -c:a libopus -frame_duration 20 -application voip -b:a 48k -vn audio.ogg`

# Generate audio.ogg from file
Download https://download.samplelib.com/mp4/sample-5s.mp4
`ffmpeg -i sample-5s.mp4 -c:a libopus -frame_duration 20 -application voip -b:a 48k -vn audio.ogg`
