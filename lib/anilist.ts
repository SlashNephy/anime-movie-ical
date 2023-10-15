export type AniListMediaResponse = {
  data: {
    Page: {
      media: {
        siteUrl: string
        startDate: {
          year?: number
          month?: number
          day?: number
        }
        title: {
          native?: string
        }
        coverImage: {
          extraLarge?: string
        }
        externalLinks: {
          url: string
          type: string
        }[]
      }[]
      pageInfo: {
        hasNextPage: boolean
      }
    }
  }
}

export async function fetchAniListMedia(
  page: number
): Promise<AniListMediaResponse> {
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
              siteUrl
              startDate {
                year
                month
                day
              }
              title {
                native
              }
              coverImage {
                extraLarge
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
