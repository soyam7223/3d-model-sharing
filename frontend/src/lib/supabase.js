import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Expose for quick debugging in dev
if (typeof window !== 'undefined' && import.meta?.env?.DEV) {
  window.sb = supabase
  console.log('🔧 Supabase client exposed as window.sb')
  console.log('🔧 Supabase URL:', supabaseUrl)
  console.log('🔧 Supabase Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')
}

// Helper functions for common operations
export const supabaseHelpers = {
  // Authentication helpers
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Database helpers
  getModels: async (limit = 10) => {
    const { data, error } = await supabase
      .from('models')
      .select(`
        id, title, description, category, thumbnail_url, created_at, is_public,
        download_count, view_count, like_count, comment_count
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  getStats: async () => {
    const { data, error } = await supabase
      .from('models')
      .select('id, created_at')
      .eq('is_public', true)
    
    if (error) throw error
    
    const totalModels = data.length
    const recentModels = data.filter(m => 
      new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length
    
    return {
      totalModels,
      recentModels,
      totalUsers: 0, // Will implement user count later
      totalDownloads: 0 // Will implement download count later
    }
  },

  // Profile helpers
  getProfileByUsername: async (username) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  getUserModelsByUsername: async (username) => {
    // First resolve the profile id by username
    const profile = await supabaseHelpers.getProfileByUsername(username)
    if (!profile) return []
    const { data, error } = await supabase
      .from('models')
      .select(`
        id, title, description, category, thumbnail_url, created_at, is_public,
        download_count, view_count, like_count, comment_count
      `)
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(m => ({
      ...m,
      thumbnailUrl: m.thumbnail_url,
      viewCount: m.view_count,
      likeCount: m.like_count,
      downloadCount: m.download_count
    }))
  },
  getProfile: async (userId) => {
    console.log('🔍 getProfile called with userId:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    console.log('🔍 getProfile result:', { data, error })
    if (error) throw error
    return data || null
  },

  updateProfile: async (userId, updates) => {
    const payload = { id: userId, ...updates }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  ensureProfile: async (user) => {
    console.log('🔍 ensureProfile called with user:', user?.id)
    if (!user) return null
    const existing = await supabaseHelpers.getProfile(user.id)
    console.log('🔍 ensureProfile - existing profile:', existing)
    if (existing) return existing
    const baseName = (user?.user_metadata?.username || user?.email?.split('@')[0] || 'user').toLowerCase()
    console.log('🔍 ensureProfile - creating profile with baseName:', baseName)
    let attempt = 0
    while (attempt < 3) {
      const candidate = attempt === 0 ? baseName : `${baseName}${Math.floor(Math.random()*10000)}`
      try {
        console.log('🔍 ensureProfile - attempting to create with username:', candidate)
        return await supabaseHelpers.updateProfile(user.id, {
          username: candidate,
          display_name: candidate,
          role: 'creator'
        })
      } catch (e) {
        console.log('🔍 ensureProfile - error creating profile:', e)
        // Unique violation on username → try another suffix
        if (e?.code === '23505') {
          attempt += 1
          continue
        }
        throw e
      }
    }
    // Final fallback
    console.log('🔍 ensureProfile - final fallback attempt')
    return await supabaseHelpers.updateProfile(user.id, {
      username: `${baseName}${Date.now()}`,
      display_name: baseName,
      role: 'creator'
    })
  }
}
