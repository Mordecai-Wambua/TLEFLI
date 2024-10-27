import mongoose from 'mongoose';
import User from '../models/User.js';
import { getFile, deleteFile } from '../utils/bucket.js';

export async function userList(req, res) {
  try {
    const users = await User.find().select('-password -__v');

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found!' });
    }

    const userList = await Promise.all(
      users.map(async (user) => {
        const userData = user.toObject();
        userData.profilePhoto = await getFile(user.profilePhoto); // Await getFile here
        return userData;
      })
    );

    return res.status(200).json({ count: users.length, userList });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error' });
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
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteUser(req, res) {
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
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: 'User deleted!' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function toAdmin(req, res) {
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
    console.error('Error updating user role:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
