export type GeocodeResult = {
  latitude: number
  longitude: number
  post_code: string
  region: string | null
  country: string | null
}

export async function geocodePostcode(
  postCode: string,
): Promise<GeocodeResult | { error: string }> {
  const res = await fetch(`https://api.postcodes.io/postcodes/${postCode}`)
  const data = await res.json()
  if (data.status >= 400) return { error: data.error as string }
  const { latitude, longitude, region, country, postcode: post_code } = data.result
  return { latitude, longitude, post_code, region: region ?? null, country: country ?? null }
}
