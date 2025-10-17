export function uploadR2(file: File, path: string) {
  return $fetch(`${useBaseURL()}/api/r2/upload?key=${path}/${file.name}`, {
    method: 'put',
    headers: {
      'X-Custom-Auth-Key': '333',
      'Content-Type': file.type,
    },
    body: file,
  })
}

interface listR2Data { prefix?: string, cursor?: string, limit?: number }

export function listR2(data?: listR2Data) {
  return $fetch(`${useBaseURL()}/api/r2/list`, {
    query: data,
    method: 'get',
    headers: {
      'X-Custom-Auth-Key': '333',
      'Content-Type': 'application/json',
    },
  })
}

export function deleteR2(name: string) {
  return $fetch(`${useBaseURL()}/api/r2/file?key=${name}`, {
    method: 'DELETE',
    headers: {
      'X-Custom-Auth-Key': '333',
    },
  })
}

export function getR2Catalogue() {
  return $fetch<any>(`${useBaseURL()}/api/r2/catalogue`, {
    method: 'GET',
    headers: {
      'X-Custom-Auth-Key': '333',
    },
  })
}
