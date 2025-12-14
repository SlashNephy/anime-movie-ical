import { hoursToSeconds } from 'date-fns'
import { z } from 'zod'

import { loadCache, savePublicCache } from './cache.ts'

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

  return validatedResponse.data.data
}

async function fetchAniListMediaWithCache(page: number): Promise<AniListMediaData> {
  const cacheKey = `https://anime-movie-ical.starrybluesky.workers.dev/anilist/${page}`
  const cached = await loadCache(cacheKey, AniListMediaDataSchema)
  if (cached) {
    return cached
  }

  const data = await fetchAniListMedia(page)
  await savePublicCache(cacheKey, data, AniListMediaDataSchema, hoursToSeconds(24))

  return data
}

export async function fetchPaginatedAniListMedia(): Promise<AniListMedia[]> {
  const media: AniListMedia[] = []
  let page = 1

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { Page } = await fetchAniListMediaWithCache(page)

    media.push(...Page.media)

    if (!Page.pageInfo.hasNextPage) {
      break
    }
    page++
  }

  return media
}
