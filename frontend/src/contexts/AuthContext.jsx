import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, supabaseHelpers } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  // Initialize auth state
  useEffect(() => {
    // Check if user is already logged in
    const checkExistingAuth = async () => {
      try {
        console.log('🔍 AuthContext: Checking existing authentication...')
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error)
          return
        }
        
        if (session?.user) {
          console.log('✅ AuthContext: Session found, user:', session.user.id)
          setUser(session.user)
          
          // Get user profile
          try {
            let profileData = await supabaseHelpers.getProfile(session.user.id)
            if (!profileData) {
              profileData = await supabaseHelpers.ensureProfile(session.user)
            }
            setProfile(profileData)
          } catch (profileError) {
            console.error('❌ AuthContext: Error getting profile:', profileError)
            // Profile might not exist yet, that's okay
          }
        } else {
          console.log('ℹ️ AuthContext: No session found')
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking existing auth:', error)
      } finally {
        console.log('🏁 AuthContext: Initial auth check complete, setting loading to false')
        setLoading(false)
      }
    }

    // Check existing authentication
    checkExistingAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state changed:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          try {
            let profileData = await supabaseHelpers.getProfile(session.user.id)
            if (!profileData) {
              profileData = await supabaseHelpers.ensureProfile(session.user)
            }
            setProfile(profileData)
          } catch (error) {
            console.error('❌ AuthContext: Error getting profile after sign in:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    // Cleanup subscription
    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Starting login process...')
      setLoading(true)
      
      const { user: userData, session } = await supabaseHelpers.signIn(email, password)

      if (userData && session) {
        console.log('✅ AuthContext: Login successful, user:', userData.id)
        setUser(userData)
        
        // Get user profile
        try {
          let profileData = await supabaseHelpers.getProfile(userData.id)
          if (!profileData) {
            profileData = await supabaseHelpers.ensureProfile(userData)
          }
          setProfile(profileData)
        } catch (profileError) {
          console.error('❌ AuthContext: Error getting profile after login:', profileError)
        }
        
        toast.success('Welcome back!')
        return { success: true }
      } else {
        console.error('❌ AuthContext: No user data in login response')
        throw new Error('No user data received')
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error)
      toast.error(error.message || 'Invalid email or password')
      return { success: false, message: error.message }
    } finally {
      console.log('🏁 AuthContext: Login process complete, setting loading to false')
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Starting logout process...')
      
      await supabaseHelpers.signOut()
      
      console.log('✅ AuthContext: Logout successful, clearing local state...')
      setUser(null)
      setProfile(null)
      
      console.log('✅ AuthContext: Logout completed successfully')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error)
      toast.error('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const signup = async (payloadOrEmail, maybePassword, maybeUsername) => {
    try {
      setLoading(true)
      // Support both signup({ email, password, username }) and signup(email, password, username)
      const payload = typeof payloadOrEmail === 'object'
        ? payloadOrEmail
        : { email: payloadOrEmail, password: maybePassword, username: maybeUsername }

      const { user: userData, session } = await supabaseHelpers.signUp(
        payload.email, 
        payload.password, 
        { username: payload.username }
      )

      if (userData && session) {
        setUser(userData)
        
        // Create profile
        try {
          const profileData = await supabaseHelpers.updateProfile(userData.id, {
            username: payload.username,
            display_name: payload.username,
            role: 'creator'
          })
          setProfile(profileData)
        } catch (profileError) {
          console.error('❌ AuthContext: Error creating profile after signup:', profileError)
        }
        
        toast.success('Account created successfully!')
        return { success: true, message: 'Account created successfully!' }
      }

      return { success: true, message: 'Account created successfully!' }
    } catch (error) {
      console.error('Signup error:', error)
      const message = error.message || 'Failed to create account'
      toast.error(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      if (!user) return null
      let profileData = await supabaseHelpers.getProfile(user.id)
      if (!profileData) {
        profileData = await supabaseHelpers.ensureProfile(user)
      }
      setProfile(profileData)
      return profileData
    } catch (error) {
      console.error('❌ AuthContext: fetchUserProfile error:', error)
      return null
    }
  }

  const updateProfile = async (profileData) => {
    try {
      if (!user) throw new Error('No user logged in')
      
      const updatedProfile = await supabaseHelpers.updateProfile(user.id, profileData)
      setProfile(updatedProfile)
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
      return { success: false, message: error.message }
    }
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    signup,
    fetchUserProfile,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

