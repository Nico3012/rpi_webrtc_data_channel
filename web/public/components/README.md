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
