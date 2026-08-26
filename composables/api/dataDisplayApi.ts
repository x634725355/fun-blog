export function uploadR2(file: File, path: string) {
  const key = `${path}/${file.name}`
  return $fetch<{ success: boolean, key: string }>(
    `${useBaseURL()}/api/r2/upload?key=${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: {
        'X-Custom-Auth-Key': '333',
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    },
  )
}

interface listR2Data { prefix?: string, cursor?: string, limit?: number }

export function listR2(data?: listR2Data) {
  return $fetch(`${useBaseURL()}/api/r2/list`, {
    query: data,
    method: 'GET',
    headers: {
      'X-Custom-Auth-Key': '333',
    },
  })
}

/** DELETE /api/r2/file — 见 docs/API.md */
export function deleteR2(key: string) {
  return $fetch<{ success: boolean }>(
    `${useBaseURL()}/api/r2/file?key=${encodeURIComponent(key)}`,
    {
      method: 'DELETE',
      headers: {
        'X-Custom-Auth-Key': '333',
      },
    },
  )
}

export function getR2Catalogue() {
  return $fetch<any>(`${useBaseURL()}/api/r2/catalogue`, {
    method: 'GET',
    headers: {
      'X-Custom-Auth-Key': '333',
    },
  })
}
