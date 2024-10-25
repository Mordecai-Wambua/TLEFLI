import User from '../models/User.js';

export async function userList(req, res) {
  try {
    const users = await User.find().select('-password -__v');

    const userList = users.map((user) => {
      const base64Photo = Buffer.from(user.profilePhoto.data).toString(
        'base64'
      );

      const photoData = `data:${user.profilePhoto.contentType};base64,${base64Photo}`;

      return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        created_at: user.created_at,
        profilePhoto: photoData,
      };
    });
    return res.status(200).json(userList);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
