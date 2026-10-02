import { describe, expect, it } from 'vitest'
import { districtsByProvince, interests } from './zimbabwe'

describe('Zimbabwe onboarding catalog', () => {
  it('includes all ten provinces and the requested Mashonaland East districts', () => {
    expect(Object.keys(districtsByProvince)).toHaveLength(10)
    expect(districtsByProvince['Mashonaland East']).toContain('Marondera')
    expect(districtsByProvince.Manicaland).toContain('Mutare')
    expect(districtsByProvince.Masvingo).toContain('Chiredzi')
  })

  it('offers crop and livestock farming interests with unique slugs', () => {
    expect(interests.some((interest) => interest.slug === 'maize' && interest.category === 'Crop')).toBe(true)
    expect(interests.some((interest) => interest.slug === 'cattle' && interest.category === 'Livestock')).toBe(true)
    expect(new Set(interests.map((interest) => interest.slug)).size).toBe(interests.length)
  })
})