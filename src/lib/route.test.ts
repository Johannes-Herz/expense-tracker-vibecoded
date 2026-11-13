import { describe, expect, it } from 'vitest'
import { buildHash, parentRoute, parseRoute, sameRoute } from './route'

describe('parseRoute / buildHash', () => {
  it('parses tabs and settings sub-pages', () => {
    expect(parseRoute('#/stats')).toEqual({ tab: 'stats' })
    expect(parseRoute('#/planning')).toEqual({ tab: 'planning' })
    expect(parseRoute('#/settings')).toEqual({ tab: 'settings' })
    expect(parseRoute('#/settings/data')).toEqual({ tab: 'settings', sub: 'data' })
    expect(parseRoute('#/settings/categories')).toEqual({ tab: 'settings', sub: 'categories' })
  })

  it('falls back to the overview for empty or unknown hashes', () => {
    expect(parseRoute('')).toEqual({ tab: 'expenses' })
    expect(parseRoute('#')).toEqual({ tab: 'expenses' })
    expect(parseRoute('#/nonsense')).toEqual({ tab: 'expenses' })
  })

  it('ignores unknown sub-pages and sub-pages of other tabs', () => {
    expect(parseRoute('#/settings/unknown')).toEqual({ tab: 'settings' })
    expect(parseRoute('#/stats/data')).toEqual({ tab: 'stats' })
  })

  it('round-trips through the hash', () => {
    for (const hash of ['#/expenses', '#/stats', '#/planning', '#/settings', '#/settings/data', '#/settings/categories']) {
      expect(buildHash(parseRoute(hash))).toBe(hash)
    }
  })

  it('knows the parent page and route equality', () => {
    expect(parentRoute({ tab: 'settings', sub: 'data' })).toEqual({ tab: 'settings' })
    expect(sameRoute({ tab: 'settings', sub: 'data' }, { tab: 'settings', sub: 'data' })).toBe(true)
    expect(sameRoute({ tab: 'settings', sub: 'data' }, { tab: 'settings' })).toBe(false)
  })
})
