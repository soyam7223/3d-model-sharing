const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow only 3D model file types
    const allowedTypes = [
      'model/gltf-binary',
      'model/gltf+json',
      'model/obj',
      'model/fbx',
      'model/stl',
      'model/3ds',
      'model/dae',
      'model/blend',
      'model/max',
      'model/ma',
      'model/mb'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only 3D model files are allowed.'), false);
    }
  }
});

// Validation middleware
const validateModelUpload = [
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('description').isLength({ min: 1, max: 1000 }).trim(),
  body('category').isIn(['characters', 'vehicles', 'buildings', 'props', 'nature', 'other']),
  body('tags').isArray({ min: 0, max: 10 }),
  body('tags.*').isLength({ min: 1, max: 20 }).trim(),
  body('license').isIn(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'other']),
  body('isPublic').isBoolean().optional()
];

// Upload 3D model
router.post('/', 
  authenticateToken, 
  requireRole(['creator', 'admin']),
  upload.single('model'),
  validateModelUpload,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No model file provided' });
      }

      const {
        title,
        description,
        category,
        tags,
        license,
        isPublic = true
      } = req.body;

      // TODO: Upload file to AWS S3 or other cloud storage
      // For now, we'll just store the file metadata
      const fileInfo = {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer
      };

      // Create model record in database
      const model = await prisma.model.create({
        data: {
          title,
          description,
          category,
          tags: tags || [],
          license,
          isPublic,
          creatorId: req.user.id,
          fileUrl: `uploads/${Date.now()}_${req.file.originalname}`, // Placeholder
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          thumbnailUrl: null, // TODO: Generate thumbnail
          previewUrl: null, // TODO: Generate preview
          viewCount: 0,
          downloadCount: 0,
          likeCount: 0
        }
      });

      // TODO: Process file upload to cloud storage
      // await uploadToS3(fileInfo, model.id);

      res.status(201).json({
        message: 'Model uploaded successfully',
        model: {
          id: model.id,
          title: model.title,
          description: model.description,
          category: model.category,
          tags: model.tags,
          license: model.license,
          isPublic: model.isPublic,
          createdAt: model.createdAt
        }
      });
    } catch (error) {
      console.error('Upload model error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload thumbnail for model
router.post('/:id/thumbnail',
  authenticateToken,
  requireRole(['creator', 'admin']),
  upload.single('thumbnail'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const modelId = parseInt(id);

      if (isNaN(modelId)) {
        return res.status(400).json({ error: 'Invalid model ID' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No thumbnail file provided' });
      }

      // Check if model exists and user owns it
      const model = await prisma.model.findFirst({
        where: {
          id: modelId,
          creatorId: req.user.id
        }
      });

      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // TODO: Upload thumbnail to cloud storage
      // await uploadThumbnailToS3(req.file, modelId);

      // Update model with thumbnail URL
      await prisma.model.update({
        where: { id: modelId },
        data: {
          thumbnailUrl: `thumbnails/${Date.now()}_${req.file.originalname}` // Placeholder
        }
      });

      res.json({
        message: 'Thumbnail uploaded successfully',
        thumbnailUrl: `thumbnails/${Date.now()}_${req.file.originalname}`
      });
    } catch (error) {
      console.error('Upload thumbnail error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload preview images for model
router.post('/:id/previews',
  authenticateToken,
  requireRole(['creator', 'admin']),
  upload.array('previews', 5), // Max 5 preview images
  async (req, res) => {
    try {
      const { id } = req.params;
      const modelId = parseInt(id);

      if (isNaN(modelId)) {
        return res.status(400).json({ error: 'Invalid model ID' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No preview files provided' });
      }

      // Check if model exists and user owns it
      const model = await prisma.model.findFirst({
        where: {
          id: modelId,
          creatorId: req.user.id
        }
      });

      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // TODO: Upload previews to cloud storage
      const previewUrls = req.files.map(file => 
        `previews/${Date.now()}_${file.originalname}`
      );

      // Update model with preview URLs
      await prisma.model.update({
        where: { id: modelId },
        data: {
          previewUrls: previewUrls
        }
      });

      res.json({
        message: 'Preview images uploaded successfully',
        previewUrls
      });
    } catch (error) {
      console.error('Upload previews error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update model metadata
router.put('/:id',
  authenticateToken,
  requireRole(['creator', 'admin']),
  validateModelUpload,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const modelId = parseInt(id);

      if (isNaN(modelId)) {
        return res.status(400).json({ error: 'Invalid model ID' });
      }

      const {
        title,
        description,
        category,
        tags,
        license,
        isPublic
      } = req.body;

      // Check if model exists and user owns it
      const existingModel = await prisma.model.findFirst({
        where: {
          id: modelId,
          creatorId: req.user.id
        }
      });

      if (!existingModel) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // Update model
      const updatedModel = await prisma.model.update({
        where: { id: modelId },
        data: {
          title,
          description,
          category,
          tags: tags || [],
          license,
          isPublic,
          updatedAt: new Date()
        }
      });

      res.json({
        message: 'Model updated successfully',
        model: updatedModel
      });
    } catch (error) {
      console.error('Update model error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete model
router.delete('/:id',
  authenticateToken,
  requireRole(['creator', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const modelId = parseInt(id);

      if (isNaN(modelId)) {
        return res.status(400).json({ error: 'Invalid model ID' });
      }

      // Check if model exists and user owns it
      const model = await prisma.model.findFirst({
        where: {
          id: modelId,
          creatorId: req.user.id
        }
      });

      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // TODO: Delete files from cloud storage
      // await deleteFromS3(model.fileUrl);
      // await deleteThumbnailFromS3(model.thumbnailUrl);
      // await deletePreviewsFromS3(model.previewUrls);

      // Delete model and related data
      await prisma.model.delete({
        where: { id: modelId }
      });

      res.json({ message: 'Model deleted successfully' });
    } catch (error) {
      console.error('Delete model error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get upload progress (for large files)
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const modelId = parseInt(id);

    if (isNaN(modelId)) {
      return res.status(400).json({ error: 'Invalid model ID' });
    }

    // TODO: Implement upload progress tracking
    // This could be stored in Redis or similar for real-time updates

    res.json({
      modelId,
      progress: 100, // Placeholder
      status: 'completed'
    });
  } catch (error) {
    console.error('Get upload progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
