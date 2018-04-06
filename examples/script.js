const __STOREKEY__ = 'skyway-siru-client-sample'
const conf = JSON.parse(localStorage.getItem(__STOREKEY__))

let topicName;

if(conf) {
  $("#input-apikey").val(conf.apikey)
  $("#input-room-name").val(conf.roomName)
  $("#input-topic-name").val(conf.topicName)
}

$("form.connect").on("submit", function(ev) {
  ev.preventDefault()
  $(this).find("button").prop("disabled", true)

  const apikey = $("#input-apikey").val()
    , roomName = $("#input-room-name").val()

  topicName = $("#input-topic-name").val()

  storeLocalStorage({apikey, roomName, topicName})
  start(roomName, apikey)
})

const storeLocalStorage = param => {
  localStorage.setItem(__STOREKEY__, JSON.stringify(param))
}

const start = (roomName, apikey) => {
  const iceServers = [
      { 'urls': 'stun:stun.webrtc.ecl.ntt.com:3478' },
      {
        'urls': 'turn:52.41.145.197:443?transport=udp',
        'credential': 's1rUu5ev',
        'username': 'siruuser'
      },
      {
        'urls': 'turn:52.41.145.197:443?transport=tcp',
        'credential': 's1rUu5ev',
        'username': 'siruuser'
      }
    ]
    , config = { iceServers, iceTransportPolicy: 'all' }
    , client = new SiRuClient(roomName, { key: apikey, debug: 3, config })

  $("#status").text('connecting...')

  client.on('connect', () => $("#status").text('connected'))

  client.on('meta', profile => {
    $("#uuid").text(profile.uuid)

    startStreaming(client, profile)
    client.subscribe(topicName);
  })

  client.on('message', (topic, data) => {
    // when data size exceeds 16 bytes, we will display data size only.
    if(data.length > 16) data = `received ${data.length} bytes of data`;

    $(`<div><b>${topic}</b> : ${data}</div>`).appendTo("#pubsub-mesg");
  })

  $("form.publish").on("submit", ev => {
    ev.preventDefault()

    let mesg = $("#pub-mesg").val()
    $("#pub-mesg").val("")

    // when message is ``number``, we will create same size of string for test purpose.
    let size;
    if( size = parseInt(mesg) ) {
      const arr = [];
      for(let i = 0; i < size; i++) arr.push('a')
      mesg = arr.join("")
    }

    if(!!mesg) client.publish(topicName, mesg)
  })
}

const startStreaming = (client, profile) => {
  $("#video-status").text("requesting")
    client.requestStreaming(profile.uuid)
    .then( stream => {
      $("#video-status").text("started")
      $("video")[0].srcObject = stream

    })
}

