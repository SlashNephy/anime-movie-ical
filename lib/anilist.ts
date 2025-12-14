import { hoursToSeconds } from 'date-fns'
import { z } from 'zod'

const AniListMediaSchema = z.object({
  id: z.number(),
  siteUrl: z.string(),
  startDate: z.object({
    year: z.number().optional(),
    month: z.number().optional(),
    day: z.number().optional(),
  }),
  title: z.object({
    native: z.string().optional(),
  }),
  externalLinks: z.array(
    z.object({
      url: z.string(),
      type: z.string(),
    }),
  ),
})

const AniListMediaDataSchema = z.object({
  Page: z.object({
    media: z.array(AniListMediaSchema),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
    }),
  }),
})

const AniListMediaResponseSchema = z.object({
  data: AniListMediaDataSchema.nullable(),
})

export type AniListMediaData = z.infer<typeof AniListMediaDataSchema>
export type AniListMedia = z.infer<typeof AniListMediaSchema>

async function fetchAniListMedia(page: number): Promise<AniListMediaData> {
  // Cache API から利用可能なキャッシュを確認
  // https://developers.cloudflare.com/workers/runtime-apis/cache/
  const cache = caches.default
  const cacheKey = `https://anime-movie-ical.starrybluesky.workers.dev/anilist/${page}`
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    const json = await cachedResponse.json()
    const validatedResponse = AniListMediaResponseSchema.safeParse(json)
    if (validatedResponse.success && validatedResponse.data.data) {
      return validatedResponse.data.data
    }

    // キャッシュデータが不正な場合は、キャッシュを削除して API から取得し直す
    await cache.delete(cacheKey)
  }

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query($page: Int!) {
          Page(page: $page, perPage: 50) {
            media(type: ANIME, format: MOVIE, status: NOT_YET_RELEASED, countryOfOrigin: JP, sort: START_DATE) {
              id
              siteUrl
              startDate {
                year
                month
                day
              }
              title {
                native
              }
              externalLinks {
                url
                type
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `,
      variables: {
        page,
      },
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch AniList media: page=${page}, ${response.statusText}`)
  }

  const json = await response.json()
  const validatedResponse = AniListMediaResponseSchema.safeParse(json)
  if (!validatedResponse.success) {
    throw new Error(`Invalid response from AniList: page=${page}, ${validatedResponse.error.message}`)
  }

  if (!validatedResponse.data.data) {
    throw new Error(`No data returned from AniList: page=${page}`)
  }

  // レスポンスをキャッシュに保存
  const responseToCache = new Response(JSON.stringify(validatedResponse.data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${hoursToSeconds(24)}`,
    },
  })
  await cache.put(cacheKey, responseToCache)

  return validatedResponse.data.data
}

export async function fetchPaginatedAniListMedia(): Promise<AniListMedia[]> {
  const media: AniListMedia[] = []
  let page = 1

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { Page } = await fetchAniListMedia(page)

    media.push(...Page.media)

    if (!Page.pageInfo.hasNextPage) {
      break
    }
    page++
  }

  return media
}
