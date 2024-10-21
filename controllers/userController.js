import User from '../models/User.js';

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

    const base64Photo = Buffer.from(user.profilePhoto.data).toString('base64');
    const profilePhoto = `data:${user.profilePhoto.contentType};base64,${base64Photo}`;

    return res.status(200).json({
      profile: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        date_joined: user.created_at,
        profilePhoto,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateProfile(req, res) {
  const { firstName, lastName, email } = req.body;
  const profilePhoto = req.file;
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized access!' });
    }

    const userId = req.user.id; // Extracted from the token by verifyToken middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }
    if (!firstName && !lastName && !email && !profilePhoto) {
      return res
        .status(400)
        .json({ message: 'At least one fields is required!' });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (profilePhoto) {
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
      user.profilePhoto = {
        data: photoData,
        contentType: contentType,
      };
    }

    await user.save();

    return res.status(200).json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
