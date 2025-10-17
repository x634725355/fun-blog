import type { UseFetchOptions } from '#app'
import type { NitroFetchOptions } from 'nitropack'

export const CLIENT = 'client'

interface ReturnData<T> {
  data: T
}

export interface InParameter {
  url: string
  config?: UseFetchOptions<any>
}

export interface InParameterClient extends InParameter {
  config?: NitroFetchOptions<any>
}

export function useBaseURL() {
  const config = useRuntimeConfig()
  let baseURL = ''

  switch (config.public.APP_ENV) {
    case 'dev':
      // baseURL = 'http://127.0.0.1:8787'
      baseURL = 'https://r2-worker.csc3.fun'
      break
    case 'pro':
      baseURL = 'https://r2-worker.csc3.fun'
      break
    default:
      break
  }

  return baseURL
}

function baseConfig() {
  const baseURL = useBaseURL()

  const base: UseFetchOptions<any> & NitroFetchOptions<any> = {
    baseURL,
    onRequest(_config) {},
    onResponse(config) {
      const { response } = config
      if (response.status === 500) {
        throw createError({
          statusCode: response.status,
          statusMessage: response._data.message,
        })
      }
    },
    onResponseError(error) {
      console.log('%c Line:48 🍌 error', 'color:#ffdd4d', error)
    },
  }

  return base
}

export function get<T>({ url, config }: InParameter) {
  return useFetch<ReturnData<T>>(url, {
    method: 'get',
    lazy: true,
    ...baseConfig(),
    ...config,
  })
}

export function post<T>({ url, config }: InParameter) {
  const { headers, ...base } = baseConfig()
  return useFetch<ReturnData<T>>(url, {
    method: 'post',
    lazy: true,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    ...base,
    ...config,
  })
}

export function put<T = any>({ url, config }: InParameter) {
  const { headers, ...base } = baseConfig()

  return useFetch<ReturnData<T>>(url, {
    method: 'put',
    lazy: true,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    ...base,
    ...config,
  })
}

export function blob<T = any>({ url, config }: InParameter) {
  return useFetch<ReturnData<T>>(url, {
    method: 'post',
    lazy: true,
    headers: {
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    ...baseConfig(),
    ...config,
  })
}

export function clientGet<T = any>({ url, config }: InParameterClient) {
  return $fetch<ReturnData<T>>(url, {
    method: 'get',
    ...baseConfig(),
    ...config,
  })
}

export function clientPost<T = any>({ url, config }: InParameterClient) {
  const { headers, ...base } = baseConfig()

  return $fetch<ReturnData<T>>(url, {
    method: 'post',
    headers: {
      ...headers as any,
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    ...base,
    ...config,
  })
}

export function clientPut<T = any>({ url, config }: InParameterClient) {
  const { headers, ...base } = baseConfig()

  return $fetch<ReturnData<T>>(url, {
    method: 'put',
    headers: {
      ...headers as any,
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    ...base,
    ...config,
  })
}
