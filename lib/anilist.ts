export type AniListMediaResponse = {
  data: {
    Page: {
      media: AniListMedia[]
      pageInfo: {
        hasNextPage: boolean
      }
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

async function fetchAniListMedia(page: number): Promise<AniListMediaResponse> {
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

  return await response.json()
}

export async function fetchPaginatedAniListMedia(): Promise<AniListMedia[]> {
  const media: AniListMedia[] = []
  let page = 1

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await fetchAniListMedia(page)

    media.push(...data.Page.media)

    if (!data.Page.pageInfo.hasNextPage) {
      break
    }
    page++
  }

  return media
}
