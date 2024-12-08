import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { uploadFile } from '../utils/bucket.js';
import { randomNameGenerator } from '../utils/randomNames.js';
import { ApiError } from '../utils/ApiError.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;
const JWT_REFRESH = process.env.JWT_REFRESH;
const defaultProfilePhotoPath = path.resolve('utils', 'profile.jpeg');

export async function register(req, res, next) {
  const { firstName, lastName, email, password, phone } = req.body || {};

  try {
    if (!(email && password && firstName && lastName && phone)) {
      throw new ApiError(400, 'All input fields are required!');
    }

    const user = await User.findOne({ email });
    if (user) {
      throw new ApiError(409, 'User already exists!');
    }

    let photoData;
    let contentType;
    const imageName = randomNameGenerator();

    if (req.file) {
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
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
    next(error);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!(email || password)) {
    return next(new ApiError(400, 'Email or password is required'));
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ApiError(404, 'User does not exist!'));
    }

    // Compare passwords using bcrypt
    if (!bcrypt.compareSync(password, user.password)) {
      return next(new ApiError(401, 'Invalid credentials!'));
    }

    // Generate JWT
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json({ message: 'Login successful!', accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  const { token } = req.body;

  if (!token) {
    return next(new ApiError(401, 'Access denied. No token provided.'));
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(404, 'User not found!'));
    }

    const accessToken = generateToken(user);
    return res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
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
