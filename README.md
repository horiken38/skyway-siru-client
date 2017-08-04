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

client.on('device:connected', (uuid, profile) => {
  // fetch echo api
  client.fetch( uuid+'/echo/hello' )
    .then(res => res.text())
    .then(text => console.log(text))

  // display remote camera streaming
  client.requestStreaming(uuid)
    .then(stream => video.srcObject = stream)
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

* [link to prebuilt library](https://s3-us-west-1.amazonaws.com/skyway-iot-sdk/dist/SiRuClient.js)

## API reference

* [SiRuClient](docs/SiRuClient.md)
* [Response](docs/response.md)

---

Copyright. NTT Communicaations Corporation All rights reserved.
