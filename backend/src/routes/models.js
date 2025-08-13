const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateModel = [
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('description').isLength({ min: 1, max: 1000 }).trim(),
  body('category').isIn(['characters', 'vehicles', 'buildings', 'props', 'nature', 'other']),
  body('tags').isArray({ min: 0, max: 10 }),
  body('tags.*').isLength({ min: 1, max: 20 }).trim()
];



// Get featured models
router.get('/featured', async (req, res) => {
  try {
    // For development, return mock data if database is not available
    const mockFeaturedModels = [
      {
        id: '1',
        title: 'Sci-Fi Character',
        description: 'A futuristic character model perfect for sci-fi games',
        category: 'characters',
        tags: 'sci-fi, character, futuristic',
        fileUrl: '/models/sci-fi-character.glb',
        previewUrl: '/previews/sci-fi-character.jpg',
        thumbnailUrl: '/thumbnails/sci-fi-character.jpg',
        fileSize: 2048576,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 156,
        viewCount: 892,
        likeCount: 67,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
        creator: {
          id: 'user1',
          username: 'SciFiArtist',
          avatar: '/avatars/sci-fi-artist.jpg'
        },
        _count: {
          likes: 67,
          comments: 23,
          downloads: 156
        }
      },
      {
        id: '2',
        title: 'Medieval Castle',
        description: 'Detailed medieval castle with towers and walls',
        category: 'buildings',
        tags: 'medieval, castle, building, fantasy',
        fileUrl: '/models/medieval-castle.glb',
        previewUrl: '/previews/medieval-castle.jpg',
        thumbnailUrl: '/thumbnails/medieval-castle.jpg',
        fileSize: 5120000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 89,
        viewCount: 445,
        likeCount: 34,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        userId: 'user2',
        username: 'MedievalBuilder',
        avatar: '/avatars/medieval-builder.jpg',
        _count: {
          likes: 34,
          comments: 12,
          downloads: 89
        }
      }
    ];

    res.json({ models: mockFeaturedModels });
  } catch (error) {
    console.error('Get featured models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending models
router.get('/trending', async (req, res) => {
  try {
    // For development, return mock data if database is not available
    const mockTrendingModels = [
      {
        id: '3',
        title: 'Racing Car',
        description: 'High-performance racing car with detailed interior',
        category: 'vehicles',
        tags: 'car, racing, vehicle, sports',
        fileUrl: '/models/racing-car.glb',
        previewUrl: '/previews/racing-car.jpg',
        thumbnailUrl: '/thumbnails/racing-car.jpg',
        fileSize: 3072000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 234,
        viewCount: 1200,
        likeCount: 89,
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000),
        userId: 'user3',
        creator: {
          id: 'user3',
          username: 'VehicleDesigner',
          avatar: '/avatars/vehicle-designer.jpg'
        },
        _count: {
          likes: 89,
          comments: 31,
          downloads: 234
        }
      },
      {
        id: '4',
        title: 'Fantasy Sword',
        description: 'Ornate fantasy sword with magical runes',
        category: 'weapons',
        tags: 'sword, weapon, fantasy, magical',
        fileUrl: '/models/fantasy-sword.glb',
        previewUrl: '/previews/fantasy-sword.jpg',
        thumbnailUrl: '/thumbnails/fantasy-sword.jpg',
        fileSize: 1024000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 178,
        viewCount: 890,
        likeCount: 56,
        createdAt: new Date(Date.now() - 259200000),
        updatedAt: new Date(Date.now() - 259200000),
        userId: 'user4',
        username: 'WeaponSmith',
        avatar: '/avatars/weapon-smith.jpg',
        _count: {
          likes: 56,
          comments: 19,
          downloads: 178
        }
      }
    ];

    res.json({ models: mockTrendingModels });
  } catch (error) {
    console.error('Get trending models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single model by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            downloads: true,
            views: true
          }
        }
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Increment view count
    await prisma.model.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    // Format response
    const response = {
      ...model,
      view_count: model.viewCount,
      download_count: model.downloadCount,
      like_count: model.likeCount,
      comment_count: model._count.comments,
      creator: {
        ...model.creator,
        avatar_url: model.creator.avatar
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all models with search and filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      category,
      tags,
      sort = 'newest',
      page = 1,
      limit = 20,
      creator
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isPublic: true
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (tags && Array.isArray(tags)) {
      where.tags = { hasSome: tags };
    }

    if (creator) {
      where.creator = { username: creator };
    }

    // Build order by clause
    let orderBy = {};
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'downloads':
        orderBy = { downloadCount: 'desc' };
        break;
      case 'likes':
        orderBy = { likeCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get models with pagination
    const [models, total] = await Promise.all([
      prisma.model.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.model.count({ where })
    ]);

    // Add like status for authenticated users
    if (req.user) {
      const modelIds = models.map(m => m.id);
      const userLikes = await prisma.like.findMany({
        where: {
          modelId: { in: modelIds },
          userId: req.user.id
        },
        select: { modelId: true }
      });

      const likedModelIds = new Set(userLikes.map(l => l.modelId));
      models.forEach(model => {
        model.isLiked = likedModelIds.has(model.id);
      });
    }

    res.json({
      models,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured models
router.get('/featured', async (req, res) => {
  try {
    // For development, return mock data if database is not available
    const mockFeaturedModels = [
      {
        id: '1',
        title: 'Sci-Fi Character',
        description: 'A futuristic character model perfect for sci-fi games',
        category: 'characters',
        tags: 'sci-fi, character, futuristic',
        fileUrl: '/models/sci-fi-character.glb',
        previewUrl: '/previews/sci-fi-character.jpg',
        thumbnailUrl: '/thumbnails/sci-fi-character.jpg',
        fileSize: 2048576,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 156,
        viewCount: 892,
        likeCount: 67,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
        creator: {
          id: 'user1',
          username: 'SciFiArtist',
          avatar: '/avatars/sci-fi-artist.jpg'
        },
        _count: {
          likes: 67,
          comments: 23,
          downloads: 156
        }
      },
      {
        id: '2',
        title: 'Medieval Castle',
        description: 'Detailed medieval castle with towers and walls',
        category: 'buildings',
        tags: 'medieval, castle, building, fantasy',
        fileUrl: '/models/medieval-castle.glb',
        previewUrl: '/previews/medieval-castle.jpg',
        thumbnailUrl: '/thumbnails/medieval-castle.jpg',
        fileSize: 5120000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 89,
        viewCount: 445,
        likeCount: 34,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        userId: 'user2',
        creator: {
          id: 'user2',
          username: 'MedievalBuilder',
          avatar: '/avatars/medieval-builder.jpg'
        },
        _count: {
          likes: 34,
          comments: 12,
          downloads: 89
        }
      }
    ];

    res.json({ models: mockFeaturedModels });
  } catch (error) {
    console.error('Get featured models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending models
router.get('/trending', async (req, res) => {
  try {
    // For development, return mock data if database is not available
    const mockTrendingModels = [
      {
        id: '3',
        title: 'Racing Car',
        description: 'High-performance racing car with detailed interior',
        category: 'vehicles',
        tags: 'car, racing, vehicle, sports',
        fileUrl: '/models/racing-car.glb',
        previewUrl: '/previews/racing-car.jpg',
        thumbnailUrl: '/thumbnails/racing-car.jpg',
        fileSize: 3072000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 234,
        viewCount: 1200,
        likeCount: 89,
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000),
        userId: 'user3',
        creator: {
          id: 'user3',
          username: 'VehicleDesigner',
          avatar: '/avatars/vehicle-designer.jpg'
        },
        _count: {
          likes: 89,
          comments: 31,
          downloads: 234
        }
      },
      {
        id: '4',
        title: 'Fantasy Sword',
        description: 'Ornate fantasy sword with magical runes',
        category: 'weapons',
        tags: 'sword, weapon, fantasy, magical',
        fileUrl: '/models/fantasy-sword.glb',
        previewUrl: '/previews/fantasy-sword.jpg',
        thumbnailUrl: '/thumbnails/fantasy-sword.jpg',
        fileSize: 1024000,
        fileType: 'glb',
        isPublic: true,
        isFree: true,
        downloadCount: 178,
        viewCount: 890,
        likeCount: 56,
        createdAt: new Date(Date.now() - 259200000),
        updatedAt: new Date(Date.now() - 259200000),
        userId: 'user4',
        creator: {
          id: 'user4',
          username: 'WeaponSmith',
          avatar: '/avatars/weapon-smith.jpg'
        },
        _count: {
          likes: 56,
          comments: 19,
          downloads: 178
        }
      }
    ];

    res.json({ models: mockTrendingModels });
  } catch (error) {
    console.error('Get trending models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Like/unlike a model
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const modelId = parseInt(id);

    if (isNaN(modelId)) {
      return res.status(400).json({ error: 'Invalid model ID' });
    }

    // Check if model exists and is public
    const model = await prisma.model.findFirst({
      where: {
        id: modelId,
        isPublic: true
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Check if user already liked this model
    const existingLike = await prisma.like.findFirst({
      where: {
        modelId: modelId,
        userId: req.user.id
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      res.json({ 
        message: 'Model unliked',
        liked: false 
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          modelId: modelId,
          userId: req.user.id
        }
      });

      res.json({ 
        message: 'Model liked',
        liked: true 
      });
    }
  } catch (error) {
    console.error('Like model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to model
router.post('/:id/comments', authenticateToken, [
  body('content').isLength({ min: 1, max: 1000 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;
    const modelId = parseInt(id);

    if (isNaN(modelId)) {
      return res.status(400).json({ error: 'Invalid model ID' });
    }

    // Check if model exists and is public
    const model = await prisma.model.findFirst({
      where: {
        id: modelId,
        isPublic: true
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        modelId: modelId,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({ 
      message: 'Comment added successfully',
      comment 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
