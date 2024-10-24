import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;
const defaultProfilePhotoPath = path.resolve('utils', 'profile.jpeg');

export async function register(req, res) {
  const { firstName, lastName, email, password } = req.body || {};

  try {
    if (!(email && password && firstName && lastName)) {
      return res.status(400).json({ message: 'All input is required!' });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists!' });
    }

    let photoData;
    let contentType;

    if (req.file) {
      console.log('User uploaded profile photo:', req.file);
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
      console.log('No file uploaded, using default profile photo');
      photoData = fs.readFileSync(defaultProfilePhotoPath);
      contentType = 'image/jpeg';
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      role: 'user',
      password: hashedPassword,
      profilePhoto: {
        data: photoData,
        contentType: contentType,
      },
    });

    await newUser.save();

    return res.status(201).json({ message: 'User created!' });
  } catch (error) {
    console.error('Register Error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email!' });
    }

    // Compare passwords using bcrypt
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password!' });
    }

    // Check if user exists
    if (!user && !isPasswordValid) {
      return res.status(401).json({ message: 'User does not exist!' });
    }

    return res.status(200).json({
      token: jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: '1h',
      }),
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
