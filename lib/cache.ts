// eslint-disable-next-line import-x/no-named-as-default
import type z from 'zod'

/**
 * Cache API から利用可能なキャッシュを確認
 * https://developers.cloudflare.com/workers/runtime-apis/cache/
 */
export async function loadCache<S extends z.ZodType>(key: string, schema: S): Promise<z.infer<S> | null> {
  const cache = caches.default
  const response = await cache.match(key)
  if (response) {
    const json = await response.json()
    const validatedResponse = await schema.safeParseAsync(json)
    if (validatedResponse.success) {
      return validatedResponse.data
    }

    // キャッシュデータが不正な場合は、キャッシュを削除
    await cache.delete(key)
  }

  return null
}

export async function savePublicCache<S extends z.ZodType>(
  key: string,
  data: z.infer<S>,
  schema: S,
  maxAgeSeconds: number,
): Promise<void> {
  const validatedData = await schema.safeParseAsync(data)
  if (!validatedData.success) {
    return
  }

  // キャッシュに保存
  const cache = caches.default
  const response = new Response(JSON.stringify(validatedData.data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAgeSeconds}`,
    },
  })
  await cache.put(key, response)
}
