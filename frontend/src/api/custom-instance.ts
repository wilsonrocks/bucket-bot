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

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
