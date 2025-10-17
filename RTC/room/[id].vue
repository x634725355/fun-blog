<script lang="ts" setup>
import type { Socket } from 'socket.io-client'
import { PeerClient } from '#imports'
import { io } from 'socket.io-client'
import MicrophoneSlashIcon from '~/components/custom/MicrophoneSlashIcon.vue'
import { useUserInfo } from '~/composables/modules/userInfo'

let localPeer: PeerClient
const toast = useToast()
const route = useRoute()
const roomname = route.params.id as string
const msg = reactive({ accept: [], send: '' })
const userInfo = useUserInfo()
const socket = ref<Socket>()
const channel = ref<ChannelObject>()
const room = ref<User[]>()
const load = ref<boolean>(false)
const localTrack = ref<TrackObject>()
const audioTrack = ref<TrackObject>()
const mediaStreamTrackHash = reactive<Record<string, MediaStreamTrack>>({})
const userMedia = useUserMedia(process.env.NODE_ENV as Mode)

const videoIcon = computed(() => userMedia.videoEnabled.value ? 'i-heroicons-video-camera' : 'i-heroicons-video-camera-slash')

async function startSocket() {
  const url = `${useBaseURL()}/ws`
  socket.value = io(url)
  socket.value.emit('joinRoom', {
    roomname,
    username: userInfo.username,
    sessionId: localPeer?.sessionId,
    channel: channel.value,
    tracks: {
      video: localTrack.value,
      audio: audioTrack.value,
      audioEnabled: true,
      videoEnabled: true,
    },
  } as User)

  socket.value.on('usersInRoom', async ({ events, data }: SocketReturn) => {
    console.log('%c Line:16 🍭 event', 'color:#e41a6a', events, data)
    switch (events) {
      case 'join':
        {
          const socketRoom: SocketRoom = data
          room.value = socketRoom.room
          const filterRoom = socketRoom.room.filter((user: User) => {
            return localPeer.sessionId !== user.sessionId
          })
          console.log('%c Line:31 🍒 filterRoom', 'color:#fca650', filterRoom, localPeer.trackToMid)
          if (filterRoom.length) {
            filterRoom.forEach(async (user) => {
              if (user.tracks?.video) {
                localPeer.pullTrack(user.tracks.video).then((videoStreamTrack) => {
                  mediaStreamTrackHash[`${user.username}video`] = videoStreamTrack
                })
              }
              if (user.tracks?.audio) {
                localPeer.pullTrack(user.tracks.audio).then((audioStreamTrack) => {
                  mediaStreamTrackHash[`${user.username}audio`] = audioStreamTrack
                })
              }

              localPeer?.pullChannel({
                sessionId: user.channel?.sessionId,
                dataChannelName: user.channel?.dataChannelName,
              })
            })
          }
        }
        break
      case 'videoUpdate':
      {
        break
      }
      case 'audioUpdate':
        break
      case 'leave':
        {
          const socketRoom: SocketRoom = data
          const roomUsername = socketRoom.room.map(p => p.username)
          const filterRoom = room.value!.filter((user: User) => {
            return !roomUsername?.includes(user.username)
          })
          console.log('%c Line:79 🌭 filterRoom', 'color:#ffdd4d', filterRoom)
          filterRoom.forEach((user) => {
            localPeer.closeTrack(mediaStreamTrackHash[user.tracks.video.trackName!])
            localPeer.closeTrack(mediaStreamTrackHash[user.tracks.audio.trackName!])
          })
        }
        break
      default:
        break
    }
  })
}

async function init() {
  if (!roomname) {
    return
  }
  localPeer = new PeerClient({ username: userInfo.username! })
  await localPeer.initialization
  const trackPromiseAll: Promise<TrackObject>[] = []

  if (userMedia.videoStreamTrack) {
    const videoStreamTrack = userMedia.videoStreamTrack
    trackPromiseAll.push(localPeer.pushTrack(videoStreamTrack.id, videoStreamTrack))
  }
  else {
    toast.add({
      title: '你没有摄像头',
      color: 'error',
    })
    trackPromiseAll.push(localPeer.pushTrackFake())
  }

  if (userMedia.audioStreamTrack) {
    const audioStreamTrack = userMedia.audioStreamTrack
    trackPromiseAll.push(localPeer.pushTrack(audioStreamTrack.id, audioStreamTrack))
  }

  const trackAll = await Promise.all(trackPromiseAll)

  localTrack.value = trackAll[0]
  audioTrack.value = trackAll[1]

  channel.value = await localPeer?.pushChannel()
}

function closeLink() {
  localPeer?.destroy()
  socket.value?.close()
}

function sendMessage() {
  const message = msg.send
  msg.send = ''
  localPeer.messageQueue.push({ data: message, username: userInfo.username! })
  localPeer?.sendChannel.send(message)
}

async function roomState() {
  const { data } = await getSessionState(localPeer!.sessionId!)
  console.log('%c Line:12 🍒 data', 'color:#33a5ff', data)
}

function videoIconHandle() {
  userMedia.videoEnabled.value ? userMedia.turnCameraOff() : userMedia.turnCameraOn()
}

function audioIconHandle() {
  userMedia.audioEnabled.value ? userMedia.turnMicOff() : userMedia.turnMicOn()
}

onMounted(async () => {
  load.value = true
  await init()
  await startSocket()
  load.value = false
})

onUnmounted(() => {
  closeLink()
})
</script>

<template>
  <LayoutMobile>
    <div class="p-2">
      <div class="flex justify-around items-center">
        <span class="truncate">房间号: {{ roomname }}</span>
        <Icon class="cursor-pointer ml-2" name="i-heroicons-clipboard-document" @click="copyText(roomname)" />
      </div>

      <div class="flex flex-wrap mb-2 justify-around">
        <div v-for="user in room" class="h-30 w-28 flex flex-col bg-slate-400 relative">
          <div class="flex justify-center items-center relative">
            <VideoSrcObject
              v-if="user.tracks?.video" class-name="flex-1"
              :video-track="userInfo.username === user.username ? toRef(userMedia.videoStreamTrack) : toRef(() => mediaStreamTrackHash[`${user.username}video`])"
            />
            <span class="absolute bottom-0">{{ userInfo.username === user.username ? 'Your Self' : '?' }}</span>
          </div>
          <AudioGlow
            v-if="user.tracks?.audio" :type="userInfo.username === user.username ? 'self' : 'other'"
            :audio-track="userInfo.username === user.username ? toRef(userMedia.audioStreamTrack) : toRef(() => mediaStreamTrackHash[`${user.username}audio`])"
          />
          <div class="text-center">
            {{ user.username }}
          </div>
        </div>
      </div>

      <div class="mt-2 mb-2 flex justify-around">
        <div
          class="w-10 h-10 border rounded-full flex justify-center items-center cursor-pointer"
          @click="audioIconHandle"
        >
          <Icon v-show="userMedia.audioEnabled.value" class="w-5 h-5" name="i-heroicons-microphone" />
          <MicrophoneSlashIcon v-show="!userMedia.audioEnabled.value" class="w-5 h-5" />
        </div>
        <div
          class="w-10 h-10 border rounded-full flex justify-center items-center cursor-pointer"
          @click="videoIconHandle"
        >
          <Icon class="w-5 h-5" :name="videoIcon" />
        </div>
      </div>

      <div class="border rounded min-h-9 mb-2 p-2">
        <div
          v-for="message in localPeer?.messageQueue" class="flex flex-col items-start"
          :class="message.username === userInfo.username && 'items-end'"
        >
          <div class="p-1 rounded bg-slate-300">
            {{ message.username }}
          </div>
          <div>{{ message.data }}</div>
        </div>
      </div>
      <UInput v-model="msg.send" />
      <div>
        <UButton class="mt-2" @click="sendMessage">
          发送
        </UButton>
        <UButton @click="roomState">
          查询房间情况
        </UButton>
      </div>
    </div>
  </LayoutMobile>
</template>

<style scoped></style>
