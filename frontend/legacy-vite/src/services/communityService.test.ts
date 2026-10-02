import { describe, expect, it } from 'vitest'
import { rankRelevantPosts, type CommunityPost } from './communityService'

function post(input: Partial<CommunityPost> & Pick<CommunityPost, 'id' | 'content' | 'authorId' | 'locationId'>): CommunityPost {
  return {
    authorName: 'Farmer',
    imageUrl: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    likeCount: 0,
    commentCount: 0,
    likedByCurrentUser: false,
    locationLabel: null,
    ...input,
  }
}

describe('relevant community posts', () => {
  it('orders the farmer\'s own district posts before interest matches', () => {
    const local = post({ id: 'local', authorId: 'nearby-farmer', locationId: 'marondera', content: 'A morning update from the district.' })
    const cropMatch = post({ id: 'crop', authorId: 'other-farmer', locationId: 'other-area', content: 'Maize planting update from another province.' })
    const unrelated = post({ id: 'unrelated', authorId: 'another-farmer', locationId: 'other-area', content: 'A poultry update.' })
    const own = post({ id: 'own', authorId: 'current-farmer', locationId: null, content: 'My field notes.' })

    expect(rankRelevantPosts([cropMatch, unrelated, own, local], {
      userId: 'current-farmer',
      locationId: 'marondera',
      interests: ['maize'],
    }).map((item) => item.id)).toEqual(['local', 'crop', 'own'])
  })

  it('returns an honest empty list when no post matches', () => {
    const unrelated = post({ id: 'unrelated', authorId: 'farmer', locationId: 'other-area', content: 'Poultry care notes.' })
    expect(rankRelevantPosts([unrelated], {
      userId: 'current-farmer',
      locationId: 'marondera',
      interests: ['maize'],
    })).toEqual([])
  })
})