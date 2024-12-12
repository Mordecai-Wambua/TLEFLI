import User from '../models/User.js';
import Item from '../models/Item.js';
import { uploadFile, getFile, deleteFile } from '../utils/bucket.js';
import { undoMatches } from '../utils/matching.js';
import { ApiError } from '../utils/ApiError.js';

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
      return next(new ApiError(400, 'At least one field is required!'));
    }

    console.log(
      `Profile update request for:\n name: ${user.firstName} ${user.lastName}\n id: ${user._id}:`
    );

    Object.assign(user, {
      firstName,
      lastName,
      email,
      phone,
    });
    if (profilePhoto) {
      try {
        const imageName = user.profilePhoto;
        await uploadFile({
          photoData: profilePhoto.buffer,
          contentType: profilePhoto.mimetype,
        });
        user.profilePhoto = imageName;
      } catch (error) {
        next(error);
      }
    }

    await user.save();
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
    // Attempt to delete the user
    const result = await user.deleteOne();
    if (!result) {
      return next(new ApiError(500, 'Failed to delete user'));
    }

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
