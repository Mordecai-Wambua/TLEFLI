import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { uploadFile } from '../utils/bucket.js';
import { randomNameGenerator } from '../utils/randomNames.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;
const JWT_REFRESH = process.env.JWT_REFRESH;
const defaultProfilePhotoPath = path.resolve('utils', 'profile.jpeg');

export async function register(req, res) {
  const { firstName, lastName, email, password, phone } = req.body || {};

  try {
    if (!(email && password && firstName && lastName && phone)) {
      return res.status(400).json({ message: 'All input is required!' });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists!' });
    }

    let photoData;
    let contentType;
    const imageName = randomNameGenerator();

    if (req.file) {
      console.log('User uploaded profile photo');
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
      console.log('No file uploaded, using default profile photo');
      photoData = fs.readFileSync(defaultProfilePhotoPath);
      contentType = 'image/jpeg';
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await uploadFile({ photoData, contentType }, imageName);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      role: 'user',
      password: hashedPassword,
      profilePhoto: imageName,
      phone,
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
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    // Compare passwords using bcrypt
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    // Generate JWT
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function refreshToken(req, res) {
  const { token } = req.body;

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const accessToken = generateToken(user);
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Refresh token Error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_REFRESH, {
    expiresIn: '7d',
  });
}
