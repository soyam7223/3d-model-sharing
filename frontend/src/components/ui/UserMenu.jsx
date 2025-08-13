import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  User, 
  ChevronDown, 
  Settings, 
  LogOut, 
  Upload,
  Edit3,
  Grid3X3,
  BarChart3,
  Download
} from 'lucide-react'

const UserMenu = () => {
  const { user, profile, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Debug logging
  console.log('🔍 UserMenu: Render state:', { user: !!user, profile: !!profile, userData: user, profileData: profile })

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  // Show basic menu even if profile is missing
  if (!user) return null

  // Use fallback values if profile is missing
  const profileExists = !!profile
  const displayName = profile?.username || user.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary-200 dark:bg-secondary-700">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-full h-full p-1 text-secondary-400" />
          )}
        </div>
        <span className="font-medium">{displayName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-secondary-200 dark:border-secondary-700">
            <p className="text-sm font-medium text-secondary-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {user.email}
            </p>
          </div>
          
          {profileExists ? (
            <>
              <Link
                to={`/profile/${profile.username}`}
                className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Link>
              <Link
                to="/profile/edit"
                className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </>
          ) : (
            <Link
              to="/profile/edit"
              className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Complete Profile
            </Link>
          )}
          
          <Link
            to="/upload"
            className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
          </Link>
          <Link
            to="/models"
            className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Manage Models
          </Link>
          <Link
            to="/analytics"
            className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Link>
          
          <Link
            to="/downloads"
            className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download History
          </Link>
          
          <Link
            to="/dashboard"
            className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
          
          <div className="border-t border-secondary-200 dark:border-secondary-700 mt-2 pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
