import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, Download, Calendar, User, Tag, Package, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const ModelDetail = () => {
  const { modelId } = useParams();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (modelId) {
      fetchModelDetails();
    }
  }, [modelId]);

  const fetchModelDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch model details from Supabase
      const { data, error: supabaseError } = await supabase
        .from('models')
        .select(`
          *,
          creator:profiles!models_user_id_fkey(
            id, username, avatar_url
          )
        `)
        .eq('id', modelId)
        .single();
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setModel(data);
    } catch (err) {
      console.error('Error fetching model:', err);
      setError(err.message);
      toast.error('Failed to load model details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download models');
      return;
    }

    if (!model.file_path) {
      toast.error('No file available for download');
      return;
    }

    try {
      setDownloading(true);
      
      // Create signed URL for download
      const { data, error } = await supabase.storage
        .from('models')
        .createSignedUrl(model.file_path, 60); // 60 seconds expiry

      if (error) throw error;

      // Record download in database
      const { error: downloadError } = await supabase
        .from('downloads')
        .insert({
          model_id: model.id,
          user_id: user.id
        });

      if (downloadError) {
        console.error('Error recording download:', downloadError);
      }

      // Update download count
      const { error: updateError } = await supabase
        .from('models')
        .update({ downloads_count: (model.downloads_count || 0) + 1 })
        .eq('id', model.id);

      if (updateError) {
        console.error('Error updating download count:', updateError);
      }

      // Start download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = model.title || '3d-model';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started!');
      
      // Refresh model data to show updated download count
      fetchModelDetails();
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download model');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: model.title,
          text: model.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading model details...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
            Model Not Found
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            {error || 'The model you are looking for could not be found.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
                {model.title}
              </h1>
              <p className="text-secondary-600 dark:text-secondary-400 text-lg">
                {model.description}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Model Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
              <User className="w-4 h-4" />
              <span>
                by{' '}
                <Link
                  to={`/profile/${model.creator?.username || 'unknown'}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {model.creator?.username || 'Unknown User'}
                </Link>
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
              <Calendar className="w-4 h-4" />
              <span>{new Date(model.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
              <Download className="w-4 h-4" />
              <span>{model.downloads_count || 0} downloads</span>
            </div>
          </div>

          {/* Tags */}
          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {model.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        {model.thumbnail_path && (
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Preview</h3>
            <div className="aspect-video bg-secondary-100 dark:bg-secondary-700 rounded-lg overflow-hidden">
              <img
                src={model.thumbnail_path}
                alt={model.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Download Section */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Download Model
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Get this 3D model for your projects
              </p>
            </div>
            
            <button
              onClick={handleDownload}
              disabled={downloading || !model.file_path}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDetail;
