export type ExternalAgriculturalStory = {
  title: string
  summary: string
  publishedAt: string
  publisher: string
  sourceUrl: string
  topics: string[]
  location: string | null
}

export interface AgriculturalNewsProvider {
  search(input: { country: 'Zimbabwe'; province?: string; interests: string[] }): Promise<ExternalAgriculturalStory[]>
}

export const agriculturalNewsStatus = {
  state: 'not-connected' as const,
  message: 'No agricultural news provider is connected. No news items are displayed.',
}