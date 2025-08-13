import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, Loader2, Home, Upload, User, Settings, LogOut } from 'lucide-react'
import ThemeToggle from './ui/ThemeToggle'
import UserMenu from './ui/UserMenu'

const Layout = ({ children }) => {
  const { user, profile, loading, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            Loading your account...
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mr-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-700 px-4 py-2 text-xs text-blue-800 dark:text-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <strong>Debug:</strong> Loading: {loading.toString()} | User: {user ? `YES (${user.id})` : 'NO'} | Profile: {profile ? `YES (${profile.username})` : 'NO'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => logout()}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-secondary-800 shadow-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">3D</span>
              </div>
              <span className="text-xl font-bold text-secondary-900 dark:text-white">3DShareSpace</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              {isAuthenticated && (
                <Link
                  to="/upload"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/upload'
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </Link>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-secondary-600 dark:text-secondary-400">
            <p>&copy; 2024 3DShareSpace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
