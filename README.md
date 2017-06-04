# SiRu-client

SkyWay IoT SDK room utility for client

## snipet

**browser**

```javascript
// obtain APIKEY from skyway.io. 
// Don't forget to config your domain in APIKEY setting in https://skyway.io/ds.
const client = new SiRuClient('myroom', {key: 'YOUR_API_KEY'})

client.on('connect', () => {
  client.subscribe('presence')
})

client.on('meta', meta => {
  // obtain uuid of connected device
  const uuid = meta.uuid // uuid of connected device

  // fetch echo api
  client.fetch( uuid+'/echo/hello' )
    .then(res => res.text())
    .then(text => console.log(text))

  // display remote camera streaming
  client.requestStreaming(profile.uuid)
})

client.on("stream", (stream, uuid) => {
  display(stream)
})

client.on('message', (topic, mesg) => {
  console.log(mesg)
})
```

# Install 

## npm

```bash
$ npm install skyway-siru-client
```

## prebuilt

* [download here](https://github.com/nttcom/skyway-siru-client/blob/master/dist/SiRuClient.min.js)

## API reference

* [API reference - SiRu client](https://github.com/nttcom/skyway-iot-sdk/blob/master/docs/apiref/siru_client.md)

---

Copyright. NTT Communicaations Corporation All rights reserved.