import User from '../models/User.js';
import Item from '../models/Item.js';
import { getFile, deleteFile } from '../utils/bucket.js';
import { fileUploadQueue } from '../utils/queues.js';
import { undoMatches } from '../utils/matching.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export async function profile(req, res) {
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

    if (!user) {
      return next(new ApiError(404, 'User not found!'));
    }
    if (!firstName && !lastName && !email && !phone && !profilePhoto) {
      return next(new ApiError(400, 'No fields provided to update!'));
    }

    const logData = {
      message: {
        task: `Profile update request for: userId: ${user._id}`,
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

export async function deleteProfile(req, res, next) {
  try {
    const userId = req.user.id; // Extracted from the token by verifyToken middleware
    const user = await User.findById(userId);

    if (!user) {
      return next(new ApiError(404, 'User not found!'));
    }

    const items = await Item.find({ 'reported_by.userId': user._id });
    if (items && items.length >= 1) {
      for (const item of items) {
        await deleteFile(item.itemImage);
        await undoMatches(item);
        await Item.findByIdAndDelete(item._id);
      }
    }

    await deleteFile(user.profilePhoto);
    const logData = {
      message: {
        task: `Successfully deleted the user ${user._id}`,
        statusCode: 200,
        success: true,
      },
    };
    // Attempt to delete the user
    await user.deleteOne();

    logger.info(logData);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    // Clear cookies
    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);

    // Respond with success message
    return res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
}
