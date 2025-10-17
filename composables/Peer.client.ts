import type { Reactive } from 'vue'
import invariant from 'tiny-invariant'
import { LocationEnum } from '~/types/callsConstant'
import Ewma from '~/utils/ewma'
import { BulkRequestDispatcher, createFakeVideoTrack, FIFOScheduler } from '~/utils/Peer.utils'
import { newDatachannel } from './api/calls'

export interface PeerParams {
  iceTrickleEnabled: boolean
  apiExtraParams?: string
  onDisconnect: (connectionState: RTCPeerConnectionState, event: Event) => void
  onConnect: (connectionState: RTCPeerConnectionState, event: Event) => void
  iceServers?: RTCIceServer[]
  username: string
}

interface PushTrackRequestEntry {
  trackName: string
  track: MediaStreamTrack
  transceiver: RTCRtpTransceiver
}

const iceGathertingTimeout = 1500 /* ms */
const newTrackTimeout = 10000
const PullTrackBatchSizeLimit = 32

function logCallsApiUsage(message: string) {
  console.log('%c Line:17 🍉', 'color:#42b983', `📞 Calls API: ${message}`)
}

export class PeerClient {
  pc: RTCPeerConnection
  transceivers: RTCRtpTransceiver[]
  trackToMid: Record<string, string>

  pendingTrackTransceivers: Record<string, (track: MediaStreamTrack) => void>
  sessionId: string | undefined
  params: PeerParams
  initialization: Promise<void>
  sendChannel!: RTCDataChannel
  remoteDataChannels: RTCDataChannel[]
  messageQueue: Reactive<{ username: string, data: any }[]>
  taskScheduler: FIFOScheduler
  pushTrackDispatcher: BulkRequestDispatcher<
    PushTrackRequestEntry,
    TracksResponse
  >

  pullTrackDispatcher: BulkRequestDispatcher<
    TrackObject,
    {
      bulkResponse: TracksResponse & ErrorResponse
      trackPromises: (Promise<MediaStreamTrack> | undefined)[]
    }
  >

  closeTrackDispatcher: BulkRequestDispatcher<string, TracksResponse>

  constructor(params: Partial<PeerParams> = {}) {
    const config = useRuntimeConfig()

    this.pc = new RTCPeerConnection({
      iceServers: params.iceServers ?? [
        {
          urls: [
            'stun:stun.cloudflare.com:3478',
            'turn:turn.cloudflare.com:3478?transport=udp',
            'turn:turn.cloudflare.com:3478?transport=tcp',
            'turns:turn.cloudflare.com:5349?transport=tcp',
          ],
          username: config.public.TURN_ID,
          credential: config.public.TURN_SECRET,
        },
      ],
      bundlePolicy: 'max-bundle',
    })
    this.transceivers = []
    this.messageQueue = reactive([])
    this.remoteDataChannels = []
    this.pendingTrackTransceivers = {}
    this.trackToMid = {}
    this.initialization = this.init()
    this.taskScheduler = new FIFOScheduler()
    this.pushTrackDispatcher = new BulkRequestDispatcher()
    this.pullTrackDispatcher = new BulkRequestDispatcher(PullTrackBatchSizeLimit)
    this.closeTrackDispatcher = new BulkRequestDispatcher()

    this.params = this.defaultParams(params)
  }

  defaultParams(params: Partial<PeerParams>) {
    return {
      iceTrickleEnabled: false,
      username: crypto.randomUUID(),
      onDisconnect: () => { },
      onConnect: () => { },
      ...params,
    }
  }

  async init() {
    // 为了建立连接, 我们至少提供一个音轨收发器(假的也行), 并且要设置一个假的数据轨道
    const _dc = this.pc.createDataChannel('server-events')
    this.transceivers.push(
      this.pc.addTransceiver('audio', { direction: 'inactive' }),
    )
    this.pc.setLocalDescription(await this.pc.createOffer())
    this.pc.addEventListener('iceconnectionstatechange', this.handleIceFailure)

    this.pc.ontrack = (event) => {
      console.log('%c Line:107 🥕 event', 'color:#6ec1c2', event)
      if (event.transceiver.mid === null) { return }
      const resolve = this.pendingTrackTransceivers[event.transceiver.mid]
      if (resolve) {
        delete this.pendingTrackTransceivers[event.transceiver.mid]
        resolve(event.track)
      }
      else {
        console.warn('No pending track for transceiver', event.transceiver)
      }
    }

    const connectedState = new Promise((resolve, _) => {
      this.pc.addEventListener('connectionstatechange', () => {
        if (this.pc.connectionState === 'connected') {
          resolve(true)
        }
      })
    })

    const gatheringReady = new Promise((resolve, _) => {
      // get all the candidates it can until to reach iceGathertingTimeout
      setTimeout(() => resolve(true), iceGathertingTimeout)
      if (this.params.iceTrickleEnabled) {
        // if ice trickle enabled, gathering is ready when it gets the first candidate
        this.pc.addEventListener('icecandidate', (_e) => {
          resolve(true)
          // send ICE trickle update here
        })
      }
      this.pc.onicegatheringstatechange = (_ev) => {
        if (this.pc.iceGatheringState === 'complete') {
          resolve(true)
        }
      }
    })

    this.pc.addEventListener('connectionstatechange', (event) => {
      switch (this.pc.connectionState) {
        case 'connected':
          this.params.onConnect(this.pc.connectionState, event)
          break
        case 'failed':
        case 'disconnected':
          this.params.onDisconnect(this.pc.connectionState, event)
      }
    })

    await gatheringReady

    invariant(this.pc.localDescription)
    logCallsApiUsage('Sending initial offer')

    const { data: response } = await newSession({ sessionDescription: { type: 'offer', sdp: this.pc.localDescription.sdp } })

    if (response.errorCode) {
      throw new Error(response.errorDescription)
    }
    this.sessionId = response.sessionId
    await this.pc.setRemoteDescription(
      new RTCSessionDescription(response.sessionDescription),
    )

    await connectedState
  }

  resolveTrack(mid: string) {
    return new Promise<MediaStreamTrack>((resolve, reject) => {
      setTimeout(reject, newTrackTimeout, 'track resolving timed out')
      this.pendingTrackTransceivers[mid] = (track: MediaStreamTrack) => resolve(track)
    })
  }

  async replaceTrack(resourceID: string, track: MediaStreamTrack) {
    console.log(`Peer.replaceTrack: ${resourceID}`, track)
    // const id = resourceID.split('/')[1]
    const id = resourceID
    // need to find the sender based on the MID?
    const mid = this.trackToMid[id]
    invariant(mid, `mid for ${id} not found`)
    const sender = this.pc.getTransceivers().find(t => t.mid === mid)?.sender
    invariant(sender, `sender for ${resourceID} not found`)
    this.trackToMid[track.id] = mid
    sender.replaceTrack(track)
    return resourceID.replace(id, track.id)
  }

  async configureSender(
    resourceID: string,
    track: MediaStreamTrack,
    newParams: {
      encodings?: RTCRtpEncodingParameters[]
    },
  ) {
    console.log(`Peer.configureSender: ${resourceID} ${track.id}`)
    const id = resourceID.split('/')[1]
    // need to find the sender based on the MID?
    const mid = this.trackToMid[id]
    invariant(mid, `mid for ${id} not found`)
    const sender = this.pc.getTransceivers().find(t => t.mid === mid)?.sender
    invariant(sender, `sender for ${resourceID} not found`)
    this.trackToMid[track.id] = mid
    const parameters = sender.getParameters()
    newParams.encodings?.forEach((encoding, i) => {
      const existing = parameters.encodings[i]
      parameters.encodings[i] = { ...existing, ...encoding }
    })
    sender.setParameters(parameters)
  }

  getTransceiverFor(
    track: MediaStreamTrack,
    sendEncodings?: RTCRtpEncodingParameters[],
  ) {
    const transceiver = this.pc.addTransceiver(track, {
      direction: 'sendonly',
      sendEncodings,
    })
    this.transceivers.push(transceiver)
    return transceiver
  }

  async pushTrack(
    trackName: string,
    track: MediaStreamTrack,
    sendEncodings?: RTCRtpEncodingParameters[],
  ): Promise<TrackObject> {
    await this.initialization
    const bulkResponse = (await this.pushTrackDispatcher.doBulkRequest(
      {
        trackName,
        track,
        transceiver: this.getTransceiverFor(track, sendEncodings),
      },
      async (batchCopy: PushTrackRequestEntry[]) => {
        return await this.taskScheduler.schedule(async () => {
          // Local offer must be created one time at most for the tracks
          await this.pc.setLocalDescription(await this.pc.createOffer())
          invariant(this.pc.localDescription)
          const request: TracksRequest = {
            tracks: batchCopy.map((trackEntry) => {
              return {
                location: 'local',
                mid: trackEntry.transceiver.mid,
                trackName: trackEntry.trackName,
              }
            }),
            sessionDescription: {
              sdp: this.pc.localDescription.sdp,
              type: 'offer',
            },
            sessionId: this.sessionId,
          }
          // stage 0
          const { data: response } = await newTracks(request)

          if (!response.errorCode) {
            // If everything went fine, we set the remote answer (once)
            await this.pc.setRemoteDescription(
              new RTCSessionDescription(response.sessionDescription),
            )
          }
          return response
        })
      },
    ))

    if (bulkResponse.errorCode) {
      throw new Error(bulkResponse.errorDescription)
    }
    const trackResponse = bulkResponse.tracks?.find(
      track => track.trackName === trackName,
    )
    if (!trackResponse) {
      throw new Error(`No response for trackName=${trackName}`)
    }
    if (trackResponse.errorCode) {
      throw new Error(
        `${trackResponse.errorCode}: ${trackResponse.errorDescription}`,
      )
    }

    invariant(trackResponse.mid)
    this.trackToMid[track.id] = trackResponse.mid

    return {
      location: 'remote',
      sessionId: this.sessionId,
      mid: trackResponse.mid,
      trackName,
    }
  }

  async pushTrackFake(): Promise<TrackObject> {
    await this.initialization
    const fakeVideoTrack = await createFakeVideoTrack()
    const transceiver = this.getTransceiverFor(fakeVideoTrack)
    const trackName = fakeVideoTrack.id

    await this.pc.setLocalDescription(await this.pc.createOffer())

    invariant(this.pc.localDescription)
    const request: TracksRequest = {
      tracks:
        [{
          location: 'local',
          trackName: fakeVideoTrack.id,
          mid: transceiver.mid,
        }],
      sessionDescription: {
        sdp: this.pc.localDescription.sdp,
        type: 'offer',
      },
      sessionId: this.sessionId,
    }

    const { data: response } = await newTracks(request)

    if (!response.errorCode) {
      // If everything went fine, we set the remote answer (once)
      await this.pc.setRemoteDescription(
        new RTCSessionDescription(response.sessionDescription),
      )
    }

    return {
      location: 'remote',
      sessionId: this.sessionId,
      mid: response.tracks![0].mid,
      trackName,
    }
  }

  async pullTrack(trackObject: TrackObject): Promise<MediaStreamTrack> {
    console.log(`%c Line:254 🌽 Peer.pullTrack: ${trackObject.trackName} from peer ${trackObject.sessionId}`, 'color:#ed9ec7')
    await this.initialization
    const { bulkResponse, trackPromises }
      = await this.pullTrackDispatcher.doBulkRequest(
        trackObject,
        async (batchCopy: TrackObject[]) => {
          return await this.taskScheduler.schedule(async () => {
            const request: TracksRequest = {
              tracks: batchCopy,
              sessionId: this.sessionId,
            }
            const { data: response } = await newTracks(request)
            if (response.errorCode) {
              throw new Error(response.errorDescription)
            }
            invariant(response.tracks)
            // resolving a mid as MediaStreamTrack must be done before setting
            // the remote offer to be able to catch it in time
            const trackPromises = response.tracks.map((track) => {
              if (track.mid) {
                return this.resolveTrack(track.mid)
              }
              else {
                return undefined
              }
            }) // todo: should this be filtered to remove undefined?
            if (response.requiresImmediateRenegotiation) {
              await this.pc.setRemoteDescription(
                new RTCSessionDescription(response.sessionDescription),
              )
              const answerSDP = await this.pc.createAnswer()
              await this.pc.setLocalDescription(answerSDP)
              await this.renegotiate()
            }
            return { bulkResponse: response, trackPromises }
          })
        },
      )
    const trackResponseIdx = bulkResponse.tracks?.findIndex(
      track =>
        track.sessionId === trackObject.sessionId
        && track.trackName === trackObject.trackName,
    )
    if (
      !bulkResponse.tracks
      || trackResponseIdx === undefined
      || trackResponseIdx === -1
    ) {
      throw new Error(
        `No response for sessionId=${trackObject.sessionId}, trackName=${trackObject.trackName}`,
      )
    }
    const trackResponse = bulkResponse.tracks[trackResponseIdx]
    if (trackResponse.errorCode) {
      throw new Error(
        `${trackResponse.errorCode}: ${trackResponse.errorDescription}`,
      )
    }
    const trackPromise = trackPromises[trackResponseIdx]
    invariant(trackPromise)
    invariant(trackResponse.mid)
    const track = await trackPromise
    this.trackToMid[track.id] = trackResponse.mid
    return track
  }

  async pullChannel(channelObject: ChannelObject): Promise<RTCDataChannel> {
    await this.initialization
    const { sessionId, dataChannelName } = channelObject
    const { data: response } = await newDatachannel({
      sessionId: this.sessionId!,
      dataChannels: [{
        location: LocationEnum.remote,
        dataChannelName: dataChannelName!,
        sessionId: sessionId!,
      }],
    })
    const remoteChannel = this.pc.createDataChannel(response.dataChannels[0].dataChannelName, {
      negotiated: true,
      id: response.dataChannels[0].id,
    })

    this.remoteDataChannels.push(remoteChannel)
    this.setupChannel(remoteChannel, response.dataChannels[0].dataChannelName)
    // await this.renegotiate()

    return remoteChannel
  }

  async pushChannel(): Promise<ChannelObject> {
    await this.initialization

    const { data: response } = await newDatachannel({
      dataChannels: [{
        location: LocationEnum.local,
        dataChannelName: this.params.username,
      }],
      sessionId: this.sessionId!,
    })

    this.sendChannel = this.pc.createDataChannel(this.params.username, {
      negotiated: true,
      id: response.dataChannels[0].id,
    })

    return {
      id: response.dataChannels[0].id,
      sessionId: this.sessionId,
      dataChannelName: response.dataChannels[0].dataChannelName,
      location: LocationEnum.remote,
    }
  }

  async closeTrack(track: MediaStreamTrack) {
    console.log(`Peer.closeTrack: ${track.id}`)
    const mid = this.trackToMid[track.id]
    if (!mid) {
      throw new Error('stream has no associated transceiver')
    }
    await this.initialization
    const bulkResponse = await this.closeTrackDispatcher.doBulkRequest(
      mid,
      async (batchCopy: string[]) => {
        return await this.taskScheduler.schedule(async () => {
          // Either the transceiver is sendonly or recvonly, we close it from this side
          // to trigger the appropriate response from Thunderclap
          const transceivers = this.pc.getTransceivers().filter((t) => {
            invariant(t.mid)
            return batchCopy.includes(t.mid)
          })
          transceivers.forEach(t => (t.direction = 'inactive'))

          await this.pc.setLocalDescription(await this.pc.createOffer())
          invariant(this.pc.localDescription)
          const request: CloseTracksRequest = {
            tracks: batchCopy.map((mid) => {
              return { mid }
            }),
            sessionDescription: {
              sdp: this.pc.localDescription.sdp,
              type: 'offer',
            },
            force: false,
          }
          const { data: response } = await closeTracks(request)

          if (response.errorCode) {
            throw new Error(response.errorDescription)
          }

          await this.pc.setRemoteDescription(
            new RTCSessionDescription(response.sessionDescription),
          )
          return response
        })
      },
    )
    const trackResponse = bulkResponse.tracks?.find(
      track => track.mid === mid,
    )
    if (!trackResponse) {
      throw new Error(`No response for mid=${mid}`)
    }
    if (trackResponse.errorCode) {
      throw new Error(
        `${trackResponse.errorCode}: ${trackResponse.errorDescription}`,
      )
    }
    delete this.trackToMid[track.id]
    this.transceivers = this.transceivers.filter(
      transceiver => transceiver.mid !== mid,
    )
  }

  async renegotiate() {
    // stage 1
    invariant(this.pc.currentLocalDescription)
    const request: RenegotiateRequest = {
      sessionDescription: {
        sdp: this.pc.currentLocalDescription.sdp,
        type: 'answer',
      },
    }
    const response = (await sessionsRenegotiate({ ...request, sessionId: this.sessionId })) as RenegotiationResponse
    if (response.errorCode) {
      throw new Error(response.errorDescription)
    }
  }

  setupChannel(channel: RTCDataChannel, username: string) {
    if (!channel) {
      return false
    }

    channel.addEventListener('message', (event) => {
      this.messageQueue.push({ data: event.data, username })
    })

    channel.onopen = () => console.log('Send channel opened')
    channel.onclose = () => console.log('Send channel closed')
  }

  outboundPacketLossPercentageEwma = new Ewma(1000, 0)
  inboundPacketLossPercentageEwma = new Ewma(1000, 0)
  availableOutboundBitrate = new Ewma(1000, 0)

  checkStats = async (timeout: number) => {
    const baseline = await this.pc.getStats()
    await new Promise(res => setTimeout(res, timeout))
    const now = await this.pc.getStats()

    now.forEach((nowReport: Stats) => {
      if (
        nowReport.type === 'candidate-pair'
        && 'availableOutgoingBitrate' in nowReport
      ) {
        this.availableOutboundBitrate.insert(
          Number(nowReport.availableOutgoingBitrate),
        )
      }

      if (
        nowReport.type !== 'remote-inbound-rtp'
        && nowReport.type !== 'inbound-rtp'
      ) {
        return
      }
      const baseReport = baseline.get(nowReport.id) as Stats
      if (!baseReport) { return }

      // For outbound-rtp, packetsLost might not be present. Consider it as 0 in such cases.
      const packetsLost = Math.max(
        (nowReport.packetsLost || 0) - (baseReport.packetsLost || 0),
        0,
      )

      if (
        nowReport.type === 'remote-inbound-rtp'
        && nowReport.fractionLost !== undefined
      ) {
        this.outboundPacketLossPercentageEwma.insert(nowReport.fractionLost)
        return
      }

      const packetsReceived
        = nowReport.packetsReceived - baseReport.packetsReceived

      if (packetsReceived > 0) {
        const packetLossPercentage = packetsLost / packetsReceived
        this.inboundPacketLossPercentageEwma.insert(packetLossPercentage)
      }
    })
  }

  getDebugInfo() {
    return {
      trackToMid: this.trackToMid,
      inboundPacketLossPercentage: this.inboundPacketLossPercentageEwma.value(),
      outboundPacketLossPercentage: this.outboundPacketLossPercentageEwma.value(),
      availableOutboundBitrate: this.availableOutboundBitrate.value(),
    }
  }

  handleIceFailure = async () => {
    const { iceConnectionState } = this.pc
    if (iceConnectionState === 'closed' || iceConnectionState === 'failed') {
      // eslint-disable-next-line no-alert
      alert(
        `Oh no! It appears that your connection closed unexpectedly. We've copied your session id to your clipboard, and will now reload the page to reconnect!`,
      )
      if (this.sessionId) {
        await navigator.clipboard.writeText(this.sessionId)
      }
      window.location.reload()
    }
  }

  destroy() {
    this.pc.removeEventListener(
      'iceconnectionstatechange',
      this.handleIceFailure,
    )
    this.pc.close()
  }
}

interface Stats {
  id: string
  timestamp: number
  type: string
  codecId: string
  kind: string
  mediaType: string
  ssrc: number
  transportId: string
  jitter: number
  packetsLost: number
  packetsReceived: number
  audioLevel: number
  bytesReceived: number
  concealedSamples: number
  concealmentEvents: number
  fecPacketsDiscarded: number
  fecPacketsReceived: number
  fractionLost?: number
  headerBytesReceived: number
  insertedSamplesForDeceleration: number
  jitterBufferDelay: number
  jitterBufferEmittedCount: number
  jitterBufferMinimumDelay: number
  jitterBufferTargetDelay: number
  lastPacketReceivedTimestamp: number
  mid: string
  packetsDiscarded: number
  packetsSent: number
  playoutId: string
  remoteId: string
  removedSamplesForAcceleration: number
  silentConcealedSamples: number
  totalAudioEnergy: number
  totalSamplesDuration: number
  totalSamplesReceived: number
  trackIdentifier: string
}
