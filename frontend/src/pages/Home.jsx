import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Package, Download, Users, Calendar } from 'lucide-react'

const Home = () => {
  const [recentModels, setRecentModels] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch recent models
        const { data: models, error: modelsError } = await supabase
          .from('models')
          .select(`
            *,
            creator:profiles!models_user_id_fkey(
              username
            )
          `)
          .order('created_at', { ascending: false })
          .limit(12)

        if (modelsError) throw modelsError

        // Fetch basic stats
        const { count: totalModels } = await supabase
          .from('models')
          .select('*', { count: 'exact', head: true })

        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        const { count: totalDownloads } = await supabase
          .from('downloads')
          .select('*', { count: 'exact', head: true })

        setRecentModels(models || [])
        setStats({
          totalModels: totalModels || 0,
          totalUsers: totalUsers || 0,
          totalDownloads: totalDownloads || 0
        })
      } catch (error) {
        console.error('Error fetching home data:', error)
        setRecentModels([])
        setStats({
          totalModels: 0,
          totalUsers: 0,
          totalDownloads: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Discover & Share Amazing 3D Models
          </h1>
          <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
            Join thousands of creators sharing their 3D models. Download amazing designs from the community.
          </p>
          <div className="space-x-4">
            <Link
              to="/upload"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors inline-block"
            >
              Upload Your Model
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-16 bg-white dark:bg-secondary-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-4">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {stats.totalModels}
                </p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Models</p>
              </div>
              
              <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {stats.totalUsers}
                </p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Users</p>
              </div>
              
              <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-4">
                  <Download className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {stats.totalDownloads}
                </p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Downloads</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Models Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
              Recent Models
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400">
              Check out the latest 3D models from our community
            </p>
          </div>

          {recentModels.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
                No models yet
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Be the first to upload a 3D model!
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Upload Model
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {model.thumbnail_path && (
                    <div className="aspect-video bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                      <img
                        src={model.thumbnail_path}
                        alt={model.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">
                      {model.title}
                    </h3>
                    
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4 line-clamp-2">
                      {model.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                      <span className="capitalize">{model.category}</span>
                      <div className="flex items-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span>{model.downloads_count || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary-500 dark:text-secondary-400">
                        by{' '}
                        <Link
                          to={`/profile/${model.creator?.username || 'unknown'}`}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {model.creator?.username || 'Unknown User'}
                        </Link>
                      </span>
                      
                      <span className="text-sm text-secondary-500 dark:text-secondary-400 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(model.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <Link
                      to={`/models/${model.id}`}
                      className="block w-full mt-4 text-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      View Model
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home
