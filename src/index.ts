import { StatusCodes } from 'http-status-codes'

import { fetchAniListMedia } from '../lib/anilist.ts'

import type { EventAttributes, DateArray } from 'ics'

// eslint-disable-next-line import/no-default-export
export default {
  async fetch(): Promise<Response> {
    // TODO: paging
    const media = await fetchAniListMedia(1)
    console.log(JSON.stringify(media))

    const events = media.data.Page.media
      .map((media) => {
        if (
          !media.startDate.year ||
          !media.startDate.month ||
          !media.startDate.day
        ) {
          return undefined
        }

        return {
          title: media.title.native,
          url: media.siteUrl,
          htmlContent: `
            <!DOCTYPE html>
            <html lang="ja">
              <body>
                <img src="${media.coverImage.extraLarge}" alt="${media.title.native}">
              </body>
            </html>
          `,
          start: [
            media.startDate.year,
            media.startDate.month,
            media.startDate.day,
          ] as const as DateArray,
          duration: {},
          startInputType: 'utc',
          calName: 'アニメ映画 公開予定 (anime-movie-ical)',
          classification: 'PUBLIC',
          productId: 'anime-movie-ical',
        } satisfies EventAttributes
      })
      .filter((event): event is NonNullable<typeof event> => !!event)

    // MEMO: 以下のエラーが発生するため、dynamic import する必要がある
    // Some functionality, such as asynchronous I/O, timeouts, and generating random values, can only be performed while handling a request
    const { createEvents } = await import('ics')
    const { value, error } = createEvents(events)
    if (error) {
      console.error(error)

      return new Response('An error occurred', {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      })
    }

    return new Response(value, {
      headers: { 'Content-Type': 'text/calendar' },
    })
  },
}
