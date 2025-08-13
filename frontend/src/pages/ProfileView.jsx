import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Calendar, Download, Package } from 'lucide-react'

const ProfileView = () => {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (username) {
      fetchProfile()
      fetchUserModels()
    }
  }, [username])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err.message)
    }
  }

  const fetchUserModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setModels(data || [])
    } catch (err) {
      console.error('Error fetching user models:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
            Profile Not Found
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            {error || 'The profile you are looking for could not be found.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
                {profile.username}
              </h1>
              <div className="flex items-center space-x-4 text-secondary-600 dark:text-secondary-400">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>{models.length} models</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Models */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">
            Models by {profile.username}
          </h2>

          {models.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
                No models yet
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                {profile.username} hasn't uploaded any 3D models yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {model.thumbnail_path && (
                    <div className="aspect-video bg-secondary-200 dark:bg-secondary-600 rounded-lg overflow-hidden mb-4">
                      <img
                        src={model.thumbnail_path}
                        alt={model.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">
                    {model.title}
                  </h3>
                  
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3 line-clamp-2">
                    {model.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400">
                    <span className="capitalize">{model.category}</span>
                    <div className="flex items-center space-x-1">
                      <Download className="w-4 h-4" />
                      <span>{model.downloads_count || 0}</span>
                    </div>
                  </div>
                  
                  <Link
                    to={`/models/${model.id}`}
                    className="block w-full mt-3 text-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    View Model
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileView
