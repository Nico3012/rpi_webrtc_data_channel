# WebRTC Component Documentation
### HTML
```html
<webrtc-connection rpi-address="..." rpi-port="..." request-video request-audio></webrtc-connection>
```
### Events
`message-received`
`connection-changed`
### Methods
getVideoStream() => MediaStream | null
getAudioStream() => MediaStream | null
isConnected() => boolean
sendData(data: string) => Promise<void>

# Digital Joystick
### HTML
```html
<digital-joystick precise stick-x stick-y default-x="0.2" default-y="-0.3"></digital-joystick>
```
### Events
`stick-move` => event.detail.x | event.detail.y
