const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile by username
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        website: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            models: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: user.id
          }
        }
      });
      isFollowing = !!follow;
    }

    res.json({
      user: {
        ...user,
        isFollowing
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Get user's models
router.get('/:username/models', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const models = await prisma.model.findMany({
      where: {
        userId: user.id,
        isPublic: true
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
            downloads: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.model.count({
      where: {
        userId: user.id,
        isPublic: true
      }
    });

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
    console.error('Get user models error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user models'
    });
  }
});

// Follow a user
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    if (followerId === userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot follow yourself'
      });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToFollow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    if (existingFollow) {
      return res.status(409).json({
        error: 'Already Following',
        message: 'You are already following this user'
      });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId: userId
      }
    });

    res.json({
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to follow user'
    });
  }
});

// Unfollow a user
router.delete('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    // Delete follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    res.json({
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unfollow user'
    });
  }
});

// Get user's followers
router.get('/:username/followers', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.follow.count({
      where: { followingId: user.id }
    });

    res.json({
      followers: followers.map(f => f.follower),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch followers'
    });
  }
});

// Get user's following
router.get('/:username/following', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.follow.count({
      where: { followerId: user.id }
    });

    res.json({
      following: following.map(f => f.following),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch following'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('website').optional().isURL().withMessage('Invalid website URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { firstName, lastName, bio, website } = req.body;
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        bio,
        website
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        website: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;
