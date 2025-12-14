import { z } from 'zod'

const AniListMediaSchema = z.object({
  id: z.number(),
  siteUrl: z.string(),
  startDate: z.object({
    year: z.number().nullish(),
    month: z.number().nullish(),
    day: z.number().nullish(),
  }),
  title: z.object({
    native: z.string().nullish(),
  }),
  externalLinks: z.array(
    z.object({
      url: z.string(),
      type: z.string(),
    }),
  ),
})

export const AniListMediaArraySchema = z.array(AniListMediaSchema)

const AniListMediaDataSchema = z.object({
  Page: z.object({
    media: z.array(AniListMediaSchema),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
    }),
  }),
})

const AniListMediaResponseSchema = z.object({
  data: AniListMediaDataSchema.nullish(),
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
    throw new Error(`Failed to fetch AniList media (page=${page}): ${response.statusText}`)
  }

  const json = await response.json()
  const validatedResponse = AniListMediaResponseSchema.safeParse(json)
  if (!validatedResponse.success) {
    throw new Error(`Invalid response from AniList (page=${page}): ${JSON.stringify(z.flattenError(validatedResponse.error))}`)
  }
  if (!validatedResponse.data.data) {
    throw new Error(`No data returned from AniList (page=${page})`)
  }

  return validatedResponse.data.data
}

export async function fetchPaginatedAniListMedia(): Promise<AniListMedia[]> {
  const media: AniListMedia[] = []
  for (let page = 1; ; page++) {
    // eslint-disable-next-line no-await-in-loop
    const { Page } = await fetchAniListMedia(page)

    media.push(...Page.media)

    if (!Page.pageInfo.hasNextPage) {
      break
    }
  }

  return media
}
