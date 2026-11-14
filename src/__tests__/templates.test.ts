import { describe, expect, it } from 'vitest'
import { cleanItems } from '../templateItems'

describe('cleanItems', () => {
  it('drops malformed items and fixes bad times and days', () => {
    expect(
      cleanItems([
        { title: ' 물 마시기 ', time: '07:00', days: [1, 1, 3] },
        { title: '늦잠', time: '25:99', days: [7, -1, 2.5, 0] },
        { title: '' },
        { time: '08:00' },
        'junk',
        null,
      ]),
    ).toEqual([
      { title: '물 마시기', time: '07:00', days: [1, 3] },
      { title: '늦잠', time: null, days: [0] },
    ])
  })

  it('handles a non-array', () => {
    expect(cleanItems({ title: 'x' })).toEqual([])
  })
})
