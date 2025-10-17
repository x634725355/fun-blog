declare interface SessionDescription {
  type: 'offer' | 'answer'
  sdp: string
}
declare interface ErrorResponse {
  errorCode?: string
  errorDescription?: string
}

declare interface NewSessionRequest {
  sessionDescription: SessionDescription
}

declare interface NewSessionResponse extends ErrorResponse {
  sessionDescription: SessionDescription
  sessionId: string
}

declare interface TrackObject {
  location?: LocationEnum
  trackName?: string
  sessionId?: string
  mid?: string | null
}

declare interface TracksRequest {
  tracks: TrackObject[]
  sessionId?: string
  sessionDescription?: SessionDescription
}

declare interface TracksResponse extends ErrorResponse {
  sessionDescription: SessionDescription
  requiresImmediateRenegotiation: boolean
  tracks?: (TrackObject & ErrorResponse)[]
}

declare interface RenegotiateRequest {
  sessionDescription: SessionDescription
}

declare interface RenegotiationResponse extends ErrorResponse {}

declare type CloseTracksRequest = TracksRequest & {
  force: boolean
}

declare interface EmptyResponse extends ErrorResponse {}

declare type CallsRequest =
  | NewSessionRequest
  | TracksRequest
  | RenegotiateRequest
  | CloseTracksRequest
declare type CallsResponse = TracksResponse

declare interface DataChannels {
  location?: LocationEnum
  sessionId?: string
  dataChannelName?: string
  id?: number
}

declare interface ChannelObject {
  location?: 'local' | 'remote'
  dataChannelName?: string
  sessionId?: string
  id?: number | null
}

declare interface newDataChannelRequest {
  dataChannels: DataChannels[]
  sessionId: string
}

declare interface newDataChannelResponse {
  dataChannels: any[]
}

declare interface SocketReturn {
  events: string
  data?: any
}

declare interface User {
  username: string
  id: string
  sessionId: string
  roomname: string
  channel: ChannelObject
  tracks: {
    audioEnabled: boolean
    videoEnabled: boolean
    screenShareEnabled: boolean
    video: TrackObject
    audio: TrackObject
    screenshare: TrackObject
  }
  mid?: string
}

declare interface SocketRoom {
  room: User[]
  user: User
}
