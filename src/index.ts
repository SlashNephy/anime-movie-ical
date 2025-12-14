import { addDays, addHours } from 'date-fns'
import { StatusCodes } from 'http-status-codes'

import { fetchPaginatedAniListMedia } from '../lib/anilist.ts'

import type { AniListMedia } from '../lib/anilist.ts'
import type { EventAttributes } from 'ics'

// eslint-disable-next-line import-x/no-default-export
export default {
  async fetch(): Promise<Response> {
    const media = await fetchPaginatedAniListMedia()
    const events = media
      .map(convertEvent)
      .filter((event): event is NonNullable<typeof event> => !!event)

    // MEMO: Cloudflare Workers で以下のエラーが発生するため、dynamic import する必要がある
    // Some functionality, such as asynchronous I/O, timeouts, and generating random values, can only be performed while handling a request.
    const { createEvents } = await import('ics')
    const { value, error } = createEvents(events)
    if (error) {
      console.error(JSON.stringify(error))

      return new Response(null, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      })
    }

    return new Response(value, {
      headers: { 'Content-Type': 'text/calendar' },
    })
  },
}

function convertEvent(media: AniListMedia): EventAttributes | null {
  if (!media.startDate.year || !media.startDate.month || !media.startDate.day) {
    return null
  }

  const start = addHours(
    new Date(
      media.startDate.year,
      media.startDate.month - 1,
      media.startDate.day,
    ),
    -9, // JST 0時の終日イベントにしたいので、時差の分引いておく
  )
  const end = addDays(start, 1)

  return {
    uid: media.id.toString(),
    title: media.title.native ?? undefined,
    description: [
      ...media.externalLinks
        .filter((link) => link.type === 'INFO')
        .map((link) => link.url),
      media.siteUrl,
    ].join('\n'),
    start: [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
    ],
    startInputType: 'utc',
    startOutputType: 'utc',
    end: [
      end.getFullYear(),
      end.getMonth() + 1,
      end.getDate(),
      end.getHours(),
    ],
    endInputType: 'utc',
    endOutputType: 'utc',
    calName: 'アニメ映画 公開予定 (anime-movie-ical)',
    classification: 'PUBLIC',
    productId: 'anime-movie-ical',
  }
}
