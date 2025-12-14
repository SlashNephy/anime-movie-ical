export type AniListMediaResponse = {
  data: AniListMediaData | null
}

export type AniListMediaData = {
  Page: {
    media: AniListMedia[]
    pageInfo: {
      hasNextPage: boolean
    }
  }
}

export type AniListMedia = {
  id: number
  siteUrl: string
  startDate: {
    year?: number
    month?: number
    day?: number
  }
  title: {
    native?: string
  }
  externalLinks: {
    url: string
    type: string
  }[]
}

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

  const json: AniListMediaResponse = await response.json()
  if (!json.data) {
    throw new Error(`No data returned from AniList: page=${page}`)
  }

  return json.data
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
