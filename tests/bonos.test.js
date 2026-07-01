import { describe, it, expect } from 'vitest'
import { calcAlcance, getNivel, getWeekStart, getWeekEnd, formatWeekRange } from '../src/lib/bonos'

describe('calcAlcance', () => {
  it('returns 0 when meta is 0', () => {
    expect(calcAlcance(50, 0)).toBe(0)
  })
  it('calculates percentage correctly', () => {
    expect(calcAlcance(68, 90)).toBeCloseTo(75.56, 1)
  })
  it('can exceed 100', () => {
    expect(calcAlcance(100, 90)).toBeCloseTo(111.11, 1)
  })
})

describe('getNivel', () => {
  it('returns tier 1 below 80', () => {
    expect(getNivel(75).tier).toBe(1)
    expect(getNivel(75).label).toBe('< 80%')
    expect(getNivel(75).color).toBe('#FF5F00')
  })
  it('returns tier 2 between 80 and 89.99', () => {
    expect(getNivel(85).tier).toBe(2)
    expect(getNivel(85).label).toBe('80–89%')
    expect(getNivel(85).color).toBe('#FFCD00')
  })
  it('returns tier 3 between 90 and 99.99', () => {
    expect(getNivel(95).tier).toBe(3)
    expect(getNivel(95).label).toBe('90–99%')
    expect(getNivel(95).color).toBe('#00B2E3')
  })
  it('returns tier 4 at 100 or above', () => {
    expect(getNivel(100).tier).toBe(4)
    expect(getNivel(105).tier).toBe(4)
    expect(getNivel(100).label).toBe('≥ 100%')
    expect(getNivel(100).color).toBe('#3F873F')
  })
})

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-07-01 is a Wednesday
    expect(getWeekStart('2026-07-01')).toBe('2026-06-29')
  })
  it('returns Monday for a Monday', () => {
    expect(getWeekStart('2026-06-29')).toBe('2026-06-29')
  })
  it('returns Monday for a Sunday', () => {
    // 2026-07-05 is a Sunday → previous Monday
    expect(getWeekStart('2026-07-05')).toBe('2026-06-29')
  })
})

describe('getWeekEnd', () => {
  it('returns Sunday 6 days after Monday', () => {
    expect(getWeekEnd('2026-06-29')).toBe('2026-07-05')
  })
})

describe('formatWeekRange', () => {
  it('formats week range in Spanish', () => {
    expect(formatWeekRange('2026-06-29')).toBe('29 Jun – 5 Jul')
  })
})
