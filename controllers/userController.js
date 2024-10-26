import User from '../models/User.js';
import { uploadFile, getFile } from '../utils/bucket.js';

export async function profile(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized access!' });
    }

    const userId = req.user.id; // Extracted from the token by verifyToken middleware
    const user = await User.findById(userId).select('-password -role -__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const userProfile = user.toObject();
    userProfile.profilePhoto = await getFile(user.profilePhoto);

    return res.status(200).json({
      profile: userProfile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateProfile(req, res) {
  const { firstName, lastName, email, phone } = req.body || {};
  const profilePhoto = req.file;

  console.log('Profile update request:', req.body, req.file);
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized access!' });
    }

    const userId = req.user.id; // Extracted from the token by verifyToken middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }
    if (!firstName && !lastName && !email && !phone && !profilePhoto) {
      return res
        .status(400)
        .json({ message: 'At least one field is required!' });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (profilePhoto) {
      try {
        const imageName = user.profilePhoto;
        const photoData = profilePhoto.buffer;
        const contentType = profilePhoto.mimetype;
        await uploadFile({ photoData, contentType }, imageName);
        user.profilePhoto = imageName;
      } catch (uploadError) {
        console.error('Error uploading profile photo:', uploadError);
        return res
          .status(500)
          .json({ message: 'Error uploading profile photo' });
      }
    }

    await user.save();

    return res.status(200).json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
