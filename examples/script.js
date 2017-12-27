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
  const client = new SiRuClient(roomName, {key: apikey})

  $("#status").text('connecting...')

  client.on('connect', () => $("#status").text('connected'))

  client.on('meta', profile => {
    $("#uuid").text(profile.uuid)

    startStreaming(client, profile)
    client.subscribe(topicName);
  })

  client.on('message', (topic, data) => {
    $(`<div><b>${topic}</b> : ${data}</div>`).appendTo("#pubsub-mesg");
  })

  $("form.publish").on("submit", ev => {
    ev.preventDefault()

    const mesg = $("#pub-mesg").val()
    $("#pub-mesg").val("")

    if(!!mesg) client.publish(topicName, `published: ${mesg}`)
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

