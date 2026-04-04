import { notifications } from '@mantine/notifications'

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
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {}
    console.error(`${method} ${url} failed:`, response.status)
    notifications.show({ title: 'Error', message, color: 'red' })
    throw new Error(message)
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
