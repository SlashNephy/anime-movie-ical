import { addDays } from 'date-fns'
import { StatusCodes } from 'http-status-codes'

import { fetchPaginatedAniListMedia } from '../lib/anilist.ts'

import type { EventAttributes, DateArray } from 'ics'

// eslint-disable-next-line import/no-default-export
export default {
  async fetch(): Promise<Response> {
    const media = await fetchPaginatedAniListMedia()
    const events = media
      .map((media) => {
        if (
          !media.startDate.year ||
          !media.startDate.month ||
          !media.startDate.day
        ) {
          return undefined
        }

        const end = addDays(
          new Date(
            media.startDate.year,
            media.startDate.month - 1,
            media.startDate.day
          ),
          1
        )

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
          startInputType: 'utc',
          startOutputType: 'utc',
          end: [
            end.getUTCFullYear(),
            end.getUTCMonth() + 1,
            end.getUTCDate(),
          ] as const as DateArray,
          endOutputType: 'utc',
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
      console.error(JSON.stringify(error))

      return new Response('An error occurred', {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      })
    }

    return new Response(value, {
      headers: { 'Content-Type': 'text/calendar' },
    })
  },
}
