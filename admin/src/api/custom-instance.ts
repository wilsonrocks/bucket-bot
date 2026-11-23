import { notifications } from '@mantine/notifications'

// Thrown for non-2xx responses; carries the parsed body so callers can act on
// structured error responses (e.g. a 422 listing what needs fixing).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
  }
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const stored = localStorage.getItem('auth')
  const jwt = stored ? (JSON.parse(stored) as { jwt: string }).jwt : null

  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...options.headers,
    },
  })

  const method = (options.method ?? 'GET').toUpperCase()

  if (!response.ok) {
    let message = `${url}: ${response.statusText}`
    let body: unknown
    try {
      body = await response.json()
      const error = (body as { error?: unknown } | null)?.error
      if (typeof error === 'string') message = error
    } catch {}
    console.error(`${method} ${url} failed:`, response.status)
    notifications.show({ title: 'Error', message, color: 'red' })
    throw new ApiError(message, response.status, body)
  }

  if (method !== 'GET') {
    notifications.show({
      title: 'Success',
      message: `${url} succeeded`,
      color: 'green',
    })
  }

  if (response.status === 204)
    return { data: undefined, status: 204, headers: response.headers } as T
  const json = await response.json()
  return { data: json, status: response.status, headers: response.headers } as T
}
