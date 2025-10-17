<script lang="ts" setup>
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { PeerClient } from '#imports'

const _id = +new Date()
const acceptMsg = ref<any[]>([])
const sendMsg = ref('')
const localMedia = await getUserMediaExtended({ audio: true, video: true }).catch(_ => false)

const localConnection = ref<PeerClient>()
const remoteConnection = ref<PeerClient>()

const sendChannel = ref<RTCDataChannel>()
const receiveChannel = ref<RTCDataChannel>()
const socket = ref<Socket>()
const isCaller = ref(false)

async function startCall() {
  isCaller.value = true
  createPeerConnection()
  createDataChannel()

  try {
    const offer = await localConnection.value?.pc.createOffer()
    await localConnection.value?.pc.setLocalDescription(offer)
    sendSignal({ type: 'offer', offer })
  }
  catch (error) {
    console.error('Error creating offer:', error)
  }
}

function setupWebSocket() {
  socket.value = io('http://localhost:7979')
  socket.value.on('events', (event) => {
    const data = JSON.parse(event)
    console.log('%c Line:36 🥓 data', 'color:#e41a6a', data)
    handleSignal(data)
  })
}

function createDataChannel() {
  sendChannel.value = localConnection.value?.pc.createDataChannel('chat')
  setupSendChannel()
}

function sendSignal(data: any) {
  socket.value?.emit('events', JSON.stringify(data))
}

function createPeerConnection() {
  localConnection.value = new PeerClient()
  localConnection.value.pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal({ type: 'candidate', candidate: event.candidate, source: 'local' })
    }
  }

  remoteConnection.value = new PeerClient()
  remoteConnection.value.pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal({ type: 'candidate', candidate: event.candidate, source: 'remote' })
    }
  }
  remoteConnection.value.pc.ondatachannel = (event) => {
    receiveChannel.value = event.channel
    setupReceiveChannel()
  }
}

function handleSignal(data: any) {
  if (data.type === 'offer' && !isCaller.value) {
    createPeerConnection()
    createDataChannel()

    remoteConnection.value?.pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => {
        return remoteConnection.value?.pc.createAnswer()
      }).then((answer) => {
        return remoteConnection.value?.pc.setLocalDescription(answer)
      }).then(() => {
        sendSignal({ type: 'answer', answer: remoteConnection.value?.pc.localDescription })
      }).catch(error => console.error('Error handling offer:', error))
  }
  else if (data.type === 'answer' && isCaller) {
    localConnection.value?.pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      .catch(error => console.error('Error handling answer:', error))
  }
  else if (data.type === 'candidate') {
    if (data.source === 'remote') {
      localConnection.value?.pc.addIceCandidate(data.candidate)
        .catch(error => console.error('Error adding ICE candidate:', error))
    }
    else {
      remoteConnection.value?.pc.addIceCandidate(data.candidate)
        .catch(error => console.error('Error adding ICE candidate:', error))
    }
  }
}

function setupSendChannel() {
  if (!sendChannel.value) {
    return false
  }
  sendChannel.value.onmessage = (event) => {
    appendMessage(`Friend: ${event.data}`)
  }
  sendChannel.value.onopen = () => console.log('Send channel opened')
  sendChannel.value.onclose = () => console.log('Send channel closed')
}

function setupReceiveChannel() {
  if (!receiveChannel.value) {
    return false
  }
  receiveChannel.value.onmessage = (event) => {
    appendMessage(`Friend: ${event.data}`)
  }
  receiveChannel.value.onopen = () => console.log('Receive channel opened')
  receiveChannel.value.onclose = () => console.log('Receive channel closed')
}

function sendMessage() {
  const message = sendMsg.value
  if (isCaller.value) {
    sendChannel.value?.send(message)
  }
  else {
    receiveChannel.value?.send(message)
  }

  sendMsg.value = ''
  acceptMsg.value.push(message)
}

function appendMessage(messages: any) {
  acceptMsg.value.push(messages)
}

function disconnectPeers() {
  localConnection.value?.pc.close()
  remoteConnection.value?.pc.close()

  sendChannel.value?.close()
  receiveChannel.value?.close()
}

onMounted(() => {
  setupWebSocket()
})

onUnmounted(() => {
  disconnectPeers()
})
</script>

<template>
  <div class="h-6 webRTC">
    <div v-if="!localMedia">
      No
    </div>
    <div>
      <video id="self" />
      <video id="ohter" />
    </div>

    <div>
      <label for="message" />
      <input
        id="message" v-model="sendMsg" class="h-8 border-2 pl-2 w-full" size="60" type="text" name="message"
        placeholder="Message text" inputmode="text" maxlength="120"
      >
      <button class="mt-2" @click="sendMessage">
        发送
      </button>
    </div>

    <div>
      <div v-for="msg in acceptMsg">
        {{ msg }}
      </div>
    </div>

    <div class="flex justify-around">
      <button @click="startCall">
        连接
      </button>
      <button>断开</button>
    </div>
  </div>
</template>

<style scoped>
.webRTC button {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
}
</style>
