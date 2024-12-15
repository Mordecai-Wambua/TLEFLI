import mongoose from 'mongoose';
import User from '../models/User.js';
import Item from '../models/Item.js';
import { getFile, deleteFile } from '../utils/bucket.js';
import { undoMatches } from '../utils/matching.js';
import { fileUploadQueue } from '../utils/queues.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export async function userList(req, res, next) {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const filter = role ? { role: role.toLowerCase() } : {};

    const users = await User.find(filter, { password: 0, __v: 0 })
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!users || users.length === 0) {
      return res.status(200).json({ users });
    }

    const profilePhotos = await Promise.all(
      users.map((user) => getFile(user.profilePhoto).catch((error) => null)) // Handle errors gracefully
    );

    const userList = users.map((user, index) => {
      const userData = user.toObject();
      userData.profilePhoto = profilePhotos[index]; // Add profile photo or `null` if failed
      return userData;
    });

    // Retrieve total users count
    const totalUsers = await User.countDocuments(filter);

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      userList,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function itemList(req, res, next) {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const filter = type ? { type: type.toLowerCase() } : {};
    const lostItems = await Item.find(filter)
      .select('-__v -reported_by')
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!lostItems || lostItems.length === 0) {
      return res.status(200).json({ items: lostItems });
    }

    const itemImages = await Promise.all(
      lostItems.map((item) => getFile(item.itemImage).catch((error) => null)) // Handle errors gracefully
    );

    const items = lostItems.map((item, index) => {
      const itemData = item.toObject();
      itemData.itemImage = itemImages[index]; // Add profile photo or `null` if failed
      return itemData;
    });

    // Retrieve total items count
    const totalItems = await Item.countDocuments(filter);

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function itemDelete(req, res, next) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    await deleteFile(item.itemImage);
    await undoMatches(item);
    await Item.findByIdAndDelete(itemId);
    return res.status(200).json({ message: 'Item deleted!' });
  } catch (error) {
    next(error);
  }
}

function validateID(id) {
  return mongoose.isValidObjectId(id);
}

export async function getUser(req, res) {
  const userId = req.params.id;
  if (!validateID(userId)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const userData = user.toObject();
    userData.profilePhoto = await getFile(user.profilePhoto);

    return res.status(200).json({ user: userData });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  const userId = req.params.id;

  if (!validateID(userId)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    await deleteFile(user.profilePhoto);
    const items = await Item.find({ 'reported_by.userId': userId });
    for (const item of items) {
      console.log('Deleting item:', item._id);
      await deleteFile(item.itemImage);
      await undoMatches(item);
      await Item.findByIdAndDelete(item._id);
    }

    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: 'User deleted!' });
  } catch (error) {
    next(error);
  }
}

export async function toAdmin(req, res, next) {
  const userId = req.params.id;

  if (!validateID(userId)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    user.role = 'admin';
    await user.save();

    return res.status(200).json({ message: 'User role updated to admin!' });
  } catch (error) {
    next(error);
  }
}

export async function dashboard(req, res, next) {
  try {
    const [userStats, itemStats] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Item.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);

    return res.status(200).json({ userStats, itemStats });
  } catch (error) {
    next(error);
  }
}

export async function profile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password -role -__v');

    if (!user) {
      return next(new ApiError(404, 'User not found!'));
    }

    const userProfile = user.toObject();
    userProfile.profilePhoto = await getFile(user.profilePhoto);

    return res.status(200).json({
      profile: userProfile,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  const { firstName, lastName, email, phone } = req.body || {};
  const profilePhoto = req.file;

  try {
    const userId = req.user.id; // Extracted from the token by verifyToken middleware

    const user = await User.findById(userId);
    if (!user) return next(new ApiError(404, 'User not found!'));

    if (!firstName && !lastName && !email && !phone && !profilePhoto) {
      return next(new ApiError(400, 'No fields provided to update!'));
    }

    const logData = {
      message: {
        task: `Profile update request for: adminId: ${user._id}`,
        statusCode: 200,
        success: true,
      },
    };

    logger.info(logData);

    Object.assign(user, {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email }),
      ...(phone && { phone }),
    });

    if (profilePhoto) {
      // Validate image and queue for processing
      fileUploadQueue.add({
        photoData: profilePhoto.buffer,
        contentType: profilePhoto.mimetype,
        imageName: user.profilePhoto,
      });
    }

    await user.save({ validateModifiedOnly: true });
    return res.status(200).json({ message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
}
