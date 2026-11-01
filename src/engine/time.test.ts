import { describe, expect, it } from 'vitest'
import { formatDuration } from './time'

describe('formatDuration', () => {
  it('pads minute and second values for live session clocks', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65)).toBe('01:05')
  })

  it('keeps durations longer than an hour readable', () => {
    expect(formatDuration(3605)).toBe('60:05')
  })

  it('clamps negative and invalid input to zero', () => {
    expect(formatDuration(-4)).toBe('00:00')
    expect(formatDuration(Number.NaN)).toBe('00:00')
  })
})
