const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateToken } = require('../middleware/auth');

// Download a model file
router.post('/:modelId', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const userId = req.user.id;
    const { ip_address, user_agent } = req.body;

    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .eq('is_public', true)
      .single();

    if (modelError || !model) {
      return res.status(404).json({ error: 'Model not found or not public' });
    }

    // Check if user has permission to download
    if (!model.is_free && model.user_id !== userId) {
      return res.status(403).json({ error: 'This model requires payment' });
    }

    // Record the download
    const { error: downloadError } = await supabase
      .from('downloads')
      .insert({
        model_id: modelId,
        user_id: userId,
        ip_address: ip_address || req.ip,
        user_agent: user_agent || req.get('User-Agent')
      });

    if (downloadError) {
      console.error('Error recording download:', downloadError);
      // Don't fail the download if tracking fails
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('models')
      .download(model.file_url);

    if (fileError) {
      console.error('Error downloading file:', fileError);
      return res.status(500).json({ error: 'Failed to download file' });
    }

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${model.title}.${model.file_type}"`);
    res.setHeader('Content-Length', fileData.size);

    // Stream the file
    res.send(fileData);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download statistics for a model
router.get('/:modelId/stats', async (req, res) => {
  try {
    const { modelId } = req.params;

    const { data: downloads, error } = await supabase
      .from('downloads')
      .select('*')
      .eq('model_id', modelId);

    if (error) {
      return res.status(500).json({ error: 'Failed to get download stats' });
    }

    const stats = {
      total_downloads: downloads.length,
      downloads_today: downloads.filter(d => {
        const today = new Date();
        const downloadDate = new Date(d.downloaded_at);
        return downloadDate.toDateString() === today.toDateString();
      }).length,
      downloads_this_week: downloads.filter(d => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const downloadDate = new Date(d.downloaded_at);
        return downloadDate >= weekAgo;
      }).length,
      downloads_this_month: downloads.filter(d => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const downloadDate = new Date(d.downloaded_at);
        return downloadDate >= monthAgo;
      }).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's download history
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: downloads, error } = await supabase
      .from('downloads')
      .select(`
        *,
        model:models(
          id,
          title,
          description,
          thumbnail_url,
          category
        )
      `)
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get download history' });
    }

    res.json(downloads);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
