export type AgriculturalAlert = {
  title: string
  description: string
  location: string
  date: string
  source: string
  sourceUrl: string
  severity: 'information' | 'watch' | 'warning' | 'urgent'
  verificationStatus: 'verified' | 'unverified'
}

export interface AgriculturalAlertsProvider {
  getAlerts(input: { country: 'Zimbabwe'; province: string; district: string; interests: string[] }): Promise<AgriculturalAlert[]>
}

export const agriculturalAlertsStatus = {
  state: 'not-connected' as const,
  message: 'No verified agricultural health alerts currently available for your area. Verified alert sources are not connected yet.',
}