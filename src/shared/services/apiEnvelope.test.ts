import { describe, expect, it } from 'vitest'

import { normalizeListResponse } from './apiEnvelope'

describe('normalizeListResponse', () => {
  it('returns the payload as-is when it is already an array', () => {
    expect(normalizeListResponse([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('extracts the array from a "data" envelope', () => {
    expect(normalizeListResponse({ data: [1, 2] })).toEqual([1, 2])
  })

  it('extracts the array from a "results" envelope', () => {
    expect(normalizeListResponse({ results: [1, 2] })).toEqual([1, 2])
  })

  it('returns an empty array for an unrecognized payload shape', () => {
    expect(normalizeListResponse({ foo: 'bar' })).toEqual([])
    expect(normalizeListResponse(null)).toEqual([])
    expect(normalizeListResponse('not an object')).toEqual([])
  })
})
