const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard overview
router.get('/overview', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic stats
    const [
      totalModels,
      totalViews,
      totalDownloads,
      totalLikes,
      totalComments
    ] = await Promise.all([
      prisma.model.count({ where: { userId } }),
      prisma.modelView.count({ where: { model: { userId } } }),
      prisma.download.count({ where: { model: { userId } } }),
      prisma.like.count({ where: { model: { userId } } }),
      prisma.comment.count({ where: { model: { userId } } })
    ]);

    // Get recent activity
    const recentModels = await prisma.model.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: {
            views: true,
            downloads: true,
            likes: true,
            comments: true
          }
        }
      }
    });

    // Get earnings summary
    const earnings = await prisma.earning.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: true
    });

    res.json({
      stats: {
        totalModels,
        totalViews,
        totalDownloads,
        totalLikes,
        totalComments
      },
      recentModels,
      earnings: {
        total: earnings._sum.amount || 0,
        count: earnings._count
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard overview'
    });
  }
});

// Get analytics data
router.get('/analytics', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get views over time
    const viewsData = await prisma.modelView.groupBy({
      by: ['createdAt'],
      where: {
        model: { userId },
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // Get downloads over time
    const downloadsData = await prisma.download.groupBy({
      by: ['createdAt'],
      where: {
        model: { userId },
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // Get top performing models
    const topModels = await prisma.model.findMany({
      where: { userId },
      orderBy: [
        { viewCount: 'desc' },
        { downloadCount: 'desc' }
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        viewCount: true,
        downloadCount: true,
        likeCount: true
      }
    });

    res.json({
      period,
      viewsData,
      downloadsData,
      topModels
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics'
    });
  }
});

// Get earnings data
router.get('/earnings', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [earnings, total] = await Promise.all([
      prisma.earning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.earning.count({ where: { userId } })
    ]);

    // Calculate summary
    const summary = await prisma.earning.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: { status: true }
    });

    const totalEarnings = summary._sum.amount || 0;
    const pendingEarnings = await prisma.earning.aggregate({
      where: { 
        userId,
        status: 'PENDING'
      },
      _sum: { amount: true }
    });

    res.json({
      earnings,
      summary: {
        total: totalEarnings,
        pending: pendingEarnings._sum.amount || 0,
        count: summary._count.status
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch earnings'
    });
  }
});

// Get uploads management
router.get('/uploads', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status = 'all' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let whereClause = { userId };
    if (status !== 'all') {
      whereClause.isPublic = status === 'public';
    }

    const [models, total] = await Promise.all([
      prisma.model.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: {
              views: true,
              downloads: true,
              likes: true,
              comments: true
            }
          }
        }
      }),
      prisma.model.count({ where: whereClause })
    ]);

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
    console.error('Get uploads error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch uploads'
    });
  }
});

// Update model status (public/private)
router.patch('/uploads/:id/status', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    // Check if model belongs to user
    const model = await prisma.model.findFirst({
      where: { id, userId }
    });

    if (!model) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Model not found'
      });
    }

    // Update model status
    const updatedModel = await prisma.model.update({
      where: { id },
      data: { isPublic },
      select: {
        id: true,
        title: true,
        isPublic: true
      }
    });

    res.json({
      message: `Model ${isPublic ? 'published' : 'made private'} successfully`,
      model: updatedModel
    });
  } catch (error) {
    console.error('Update model status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update model status'
    });
  }
});

// Get user settings
router.get('/settings', requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        website: true,
        role: true,
        isVerified: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user settings'
    });
  }
});

module.exports = router;
