import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { forgotPassword, loading } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setError('')
    setSuccess(false)
    
    const result = await forgotPassword(email)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg mr-2 flex items-center justify-center">
                <span className="text-white font-bold">3D</span>
              </div>
              3Dsharespace
            </Link>
            <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-4">
            <div className="text-center">
              <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                Password reset link sent successfully!
              </p>
            </div>
            
            <Link
              to="/login"
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg mr-2 flex items-center justify-center">
              <span className="text-white font-bold">3D</span>
            </div>
            3Dsharespace
          </Link>
          <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-800 dark:text-white"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Send reset link
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>

          {/* Links */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword
