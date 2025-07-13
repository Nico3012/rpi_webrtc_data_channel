# How to find microphone hardware device
![List of CAPTURE Hardware Devices](plughw.png)
`ffmpeg -f alsa -i plughw:3,0` where the 3 is the `card` id and the 0 is the `device` id like on the image
