import type { SupabaseClient } from '@supabase/supabase-js'

const imageBucket = 'post-images'
const maximumImageBytes = 8 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type CommunityPost = {
  id: string
  authorId: string
  authorName: string
  content: string
  imageUrl: string | null
  createdAt: string
  likeCount: number
  commentCount: number
  likedByCurrentUser: boolean
  locationId: string | null
  locationLabel: string | null
}

type PostRow = {
  id: string
  author_id: string
  content: string
  image_path: string | null
  created_at: string
}

type CommentRow = {
  id: string
  author_id: string
  content: string
  created_at: string
}

type ProfileRow = {
  user_id: string
  location_id: string
  town_area: string
  location: { province: string; district: string } | null
}

export type CommunityComment = {
  id: string
  authorName: string
  content: string
  createdAt: string
}

export function rankRelevantPosts(
  posts: CommunityPost[],
  input: { userId: string; locationId: string; interests: string[] },
) {
  const terms = input.interests.map((interest) => interest.toLocaleLowerCase()).filter(Boolean)
  return posts
    .map((post) => {
      const matchesLocation = post.locationId === input.locationId
      const matchesInterest = terms.some((term) => post.content.toLocaleLowerCase().includes(term))
      const isOwnPost = post.authorId === input.userId
      const score = Number(matchesLocation) * 4 + Number(matchesInterest) * 2 + Number(isOwnPost)
      return { post, score }
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.post.createdAt.localeCompare(left.post.createdAt))
    .map(({ post }) => post)
}

export async function loadRelevantPosts(
  client: SupabaseClient,
  input: { userId: string; locationId: string; interests: string[] },
): Promise<CommunityPost[]> {
  const { data: postRows, error: postError } = await client
    .from('posts')
    .select('id,author_id,content,image_path,created_at')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(60)
  if (postError) throw postError

  const posts = (postRows ?? []) as PostRow[]
  if (!posts.length) return []
  const postIds = posts.map((post) => post.id)
  const authorIds = [...new Set(posts.map((post) => post.author_id))]
  const [authorsResult, profilesResult, likesResult, commentsResult] = await Promise.all([
    client.from('users').select('id,display_name').in('id', authorIds),
    client.from('farmer_profiles').select('user_id,location_id,town_area,location:locations(province,district)').in('user_id', authorIds),
    client.from('likes').select('post_id,user_id').in('post_id', postIds),
    client.from('comments').select('post_id').in('post_id', postIds),
  ])
  const error = authorsResult.error ?? profilesResult.error ?? likesResult.error ?? commentsResult.error
  if (error) throw error

  const authors = new Map((authorsResult.data ?? []).map((author) => [author.id, author.display_name]))
  const locations = new Map((profilesResult.data ?? []).map((row) => {
    const profile = row as unknown as ProfileRow
    return [profile.user_id, {
      locationId: profile.location_id,
      label: [profile.town_area, profile.location?.district, profile.location?.province].filter(Boolean).join(', '),
    }] as const
  }))
  const likeCounts = new Map<string, number>()
  const likedByCurrentUser = new Set<string>()
  for (const like of likesResult.data ?? []) {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1)
    if (like.user_id === input.userId) likedByCurrentUser.add(like.post_id)
  }
  const commentCounts = new Map<string, number>()
  for (const comment of commentsResult.data ?? []) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1)
  }

  const mapped = posts.map((post) => {
    const imageUrl = post.image_path ? client.storage.from(imageBucket).getPublicUrl(post.image_path).data.publicUrl : null
    return {
      id: post.id,
      authorId: post.author_id,
      authorName: authors.get(post.author_id) || 'Farmer',
      content: post.content,
      imageUrl,
      createdAt: post.created_at,
      likeCount: likeCounts.get(post.id) ?? 0,
      commentCount: commentCounts.get(post.id) ?? 0,
      likedByCurrentUser: likedByCurrentUser.has(post.id),
      locationId: locations.get(post.author_id)?.locationId ?? null,
      locationLabel: locations.get(post.author_id)?.label ?? null,
    }
  })

  return rankRelevantPosts(mapped, input)
}

export async function createCommunityPost(
  client: SupabaseClient,
  input: { userId: string; content: string; image?: File },
) {
  const content = input.content.trim()
  if (!content || content.length > 10000) throw new Error('Posts must be between 1 and 10,000 characters.')
  if (input.image && !allowedImageTypes.has(input.image.type)) throw new Error('Choose a JPEG, PNG, or WebP image.')
  if (input.image && input.image.size > maximumImageBytes) throw new Error('Images must be 8 MB or smaller.')

  let imagePath: string | null = null
  if (input.image) {
    const extension = input.image.type === 'image/jpeg' ? 'jpg' : input.image.type.split('/')[1]
    imagePath = `${input.userId}/${crypto.randomUUID()}.${extension}`
    const { error } = await client.storage.from(imageBucket).upload(imagePath, input.image, {
      contentType: input.image.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
  }

  const { data, error } = await client.from('posts').insert({
    author_id: input.userId,
    content,
    image_path: imagePath,
    visibility: 'public',
  }).select('id').single()
  if (error) {
    if (imagePath) await client.storage.from(imageBucket).remove([imagePath])
    throw error
  }
  return data.id as string
}

export async function togglePostLike(client: SupabaseClient, userId: string, postId: string, isLiked: boolean) {
  const result = isLiked
    ? await client.from('likes').delete().eq('user_id', userId).eq('post_id', postId)
    : await client.from('likes').insert({ user_id: userId, post_id: postId })
  if (result.error) throw result.error
}

export async function loadPostComments(client: SupabaseClient, postId: string): Promise<CommunityComment[]> {
  const { data, error } = await client.from('comments').select('id,author_id,content,created_at').eq('post_id', postId).order('created_at')
  if (error) throw error
  const comments = (data ?? []) as CommentRow[]
  if (!comments.length) return []
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))]
  const authorsResult = await client.from('users').select('id,display_name').in('id', authorIds)
  if (authorsResult.error) throw authorsResult.error
  const authors = new Map((authorsResult.data ?? []).map((author) => [author.id, author.display_name]))
  return comments.map((comment) => ({
    id: comment.id,
    authorName: authors.get(comment.author_id) || 'Farmer',
    content: comment.content,
    createdAt: comment.created_at,
  }))
}

export async function addPostComment(client: SupabaseClient, userId: string, postId: string, content: string) {
  const normalized = content.trim()
  if (!normalized || normalized.length > 5000) throw new Error('Comments must be between 1 and 5,000 characters.')
  const { error } = await client.from('comments').insert({ post_id: postId, author_id: userId, content: normalized })
  if (error) throw error
}