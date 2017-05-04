# SiRu-client

SkyWay IoT SDK room utility for client

## snipet

**browser**

```javascript
// obtain APIKEY from skyway.io. Don't forget to config your domain in APIKEY setting.
const client = new SiRuClient('myroom', {key: 'YOUR_API_KEY', origin: 'YOUR_DOMAIN'})

client.on('connect', () => {
  client.subscribe('presence')

  client.fetch('/echo/hello',

})

client.on('meta', meta => {
  // obtain uuid of connected device
  const uuid = meta.uuid // uuid of connected device

  // fetch echo api
  client.fetch('/echo/hello', {uuid})
    .then(res => res.text())
    .then(text => console.log(text))
    // #=> 'hello'

  // display remote camera streaming
  client.requestStreaming(profile.uuid)

  client.on("stream", (stream, uuid) => {
    display(stream)
  })
})


})

client.on('message', (topic, mesg) => {
  console.log(mesg)
})
```


