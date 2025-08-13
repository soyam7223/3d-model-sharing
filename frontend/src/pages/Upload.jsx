import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Upload as UploadIcon, 
  X, 
  File, 
  Image, 
  Tag, 
  Type, 
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

const Upload = () => {
  const { user, profile, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const modelInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Characters',
    tags: ''
  })
  
  const [files, setFiles] = useState({
    model: null,
    thumbnail: null
  })
  
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState({})

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0], 'model')
    }
  }, [])

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            You need to be logged in to upload 3D models.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  // Handle file selection
  const handleFileSelect = (file, type) => {
    console.log('🔍 File selected:', file.name, 'Type:', type, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB')
    
    const allowedModelTypes = ['obj', 'fbx', 'glb', 'gltf', 'dae', 'blend', '3ds', 'max', 'ma', 'mb']
    const allowedImageTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    
    const fileExtension = file.name.split('.').pop().toLowerCase()
    console.log('🔍 File extension:', fileExtension)
    
    if (type === 'model') {
      if (!allowedModelTypes.includes(fileExtension)) {
        toast.error(`Invalid model file type. Allowed: ${allowedModelTypes.join(', ')}`)
        return
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('Model file size must be less than 100MB')
        return
      }
    } else if (type === 'thumbnail') {
      if (!allowedImageTypes.includes(fileExtension)) {
        toast.error(`Invalid image file type. Allowed: ${allowedImageTypes.join(', ')}`)
        return
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Thumbnail file size must be less than 5MB')
        return
      }
    }
    
    setFiles(prev => ({
      ...prev,
      [type]: file
    }))
    
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [type]: undefined
    }))
    
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} file selected: ${file.name}`)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [name]: undefined
    }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }
    
    if (!files.model) {
      newErrors.model = '3D model file is required'
    }
    
    if (!files.thumbnail) {
      newErrors.thumbnail = 'Thumbnail image is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Upload model file
      const modelFileName = `${Date.now()}-${files.model.name}`
      const { data: modelData, error: modelError } = await supabase.storage
        .from('models')
        .upload(modelFileName, files.model)
      
      if (modelError) throw modelError
      
      setUploadProgress(30)
      
      // Upload thumbnail
      const thumbnailFileName = `${Date.now()}-${files.thumbnail.name}`
      const { data: thumbnailData, error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailFileName, files.thumbnail)
      
      if (thumbnailError) throw thumbnailError
      
      setUploadProgress(60)
      
      // Create model record in database
      const modelRecordData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        file_path: modelData.path,
        thumbnail_path: thumbnailData.path,
        user_id: user.id,
        file_size: files.model.size,
        file_type: files.model.name.split('.').pop().toLowerCase()
      }
      
      const { data: dbModel, error: dbError } = await supabase
        .from('models')
        .insert(modelRecordData)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      setUploadProgress(100)
      
      toast.success('Model uploaded successfully!')
      
      // Redirect to model detail page
      navigate(`/models/${dbModel.id}`)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Remove file
  const removeFile = (type) => {
    setFiles(prev => ({
      ...prev,
      [type]: null
    }))
    setErrors(prev => ({
      ...prev,
      [type]: undefined
    }))
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
            Upload 3D Model
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Share your 3D models with the community
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Model Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.title 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-secondary-300 dark:border-secondary-600 focus:border-primary-500'
                  } dark:bg-secondary-700 dark:text-white`}
                  placeholder="Enter model title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white"
                >
                  <option value="Characters">Characters</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Buildings">Buildings</option>
                  <option value="Props">Props</option>
                  <option value="Nature">Nature</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Weapons">Weapons</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.description 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-secondary-300 dark:border-secondary-600 focus:border-primary-500'
                } dark:bg-secondary-700 dark:text-white`}
                placeholder="Describe your 3D model..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white"
                placeholder="Enter tags separated by commas (e.g., character, fantasy, warrior)"
              />
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Separate tags with commas to help others find your model
              </p>
            </div>

            {/* File Upload Sections */}
            <div className="space-y-6">
              {/* 3D Model File */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  3D Model File *
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400 dark:hover:border-secondary-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {files.model ? (
                    <div className="flex items-center justify-center space-x-3">
                      <File className="w-8 h-8 text-primary-600" />
                      <div className="text-left">
                        <p className="font-medium text-secondary-900 dark:text-white">{files.model.name}</p>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          {formatFileSize(files.model.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('model')}
                        className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <UploadIcon className="mx-auto h-12 w-12 text-secondary-400" />
                      <div className="mt-4">
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">
                          <span className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
                            Click to upload
                          </span>{' '}
                          or drag and drop
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          OBJ, FBX, GLB, GLTF, DAE, BLEND, 3DS, MAX, MA, MB (max 100MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={modelInputRef}
                  type="file"
                  className="hidden"
                  accept=".obj,.fbx,.glb,.gltf,.dae,.blend,.3ds,.max,.ma,.mb"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0], 'model')}
                />
                {errors.model && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.model}
                  </p>
                )}
              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Thumbnail Image *
                </label>
                <div className="border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg p-6 text-center hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors">
                  {files.thumbnail ? (
                    <div className="flex items-center justify-center space-x-3">
                      <Image className="w-8 h-8 text-primary-600" />
                      <div className="text-left">
                        <p className="font-medium text-secondary-900 dark:text-white">{files.thumbnail.name}</p>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          {formatFileSize(files.thumbnail.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('thumbnail')}
                        className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Image className="mx-auto h-12 w-12 text-secondary-400" />
                      <div className="mt-4">
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">
                          <span className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
                            Click to upload
                          </span>{' '}
                          or drag and drop
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          JPG, PNG, WEBP, GIF (max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0], 'thumbnail')}
                />
                {errors.thumbnail && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.thumbnail}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-3 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isUploading}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    <span>Upload Model</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default Upload
