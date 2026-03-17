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
    const errorMsg = `${response.status} ${response.statusText}`
    console.error(`${method} ${url} failed:`, errorMsg)
    notifications.show({
      title: 'Error',
      message: `${url}: ${response.statusText}`,
      color: 'red',
    })
    throw new Error(errorMsg)
  }

  if (method === 'POST') {
    notifications.show({
      title: 'Success',
      message: `${url} succeeded`,
      color: 'green',
    })
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
