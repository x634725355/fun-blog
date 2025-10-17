export async function newSession(body: NewSessionRequest) {
  const res = await clientPost<NewSessionResponse>({ url: '/node/v1/calls/sessions/new', config: { body } })

  return res
}

export async function newTracks(body: TracksRequest) {
  const res = await clientPost<CallsResponse>({ url: '/node/v1/calls/tracks/new', config: { body } })

  return res
}

export async function sessionsRenegotiate(body: any) {
  const res = await clientPut<CallsResponse>({ url: '/node/v1/calls/sessions/renegotiate', config: { body } })

  return res
}

export async function closeTracks(body: any) {
  const res = await clientPut<CallsResponse>({ url: '/node/v1/calls/tracks/close', config: { body } })

  return res
}

export async function getSessionState(sessionId: string) {
  const res = await clientGet<CallsResponse>({ url: '/node/v1/calls/sessionstate', config: { query: { sessionId } } })

  return res
}

export async function newDatachannel(body: newDataChannelRequest) {
  const res = await clientPost<newDataChannelResponse>({ url: '/node/v1/calls/datachannel/new', config: { body } })

  return res
}
