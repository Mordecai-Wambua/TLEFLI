import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import User from '../models/User.js';
import { randomNameGenerator } from '../utils/randomNames.js';
import { ApiError } from '../utils/ApiError.js';
import { fileUploadQueue, emailQueue } from '../utils/queues.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;
const JWT_REFRESH = process.env.JWT_REFRESH;
const defaultProfilePhotoPath = path.resolve('utils', 'profile.jpeg');

export async function register(req, res, next) {
  const { firstName, lastName, email, password, phone } = req.body || {};

  try {
    if (!email || !password || !firstName || !lastName || !phone) {
      return next(new ApiError(400, 'All input fields are required!'));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(409, 'User already exists!'));
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

    const hashedPassword = await bcryptjs.hash(password, 8);
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Create a new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      role: 'user',
      password: hashedPassword,
      profilePhoto: imageName,
      phone,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    fileUploadQueue.add({ photoData, contentType, imageName });
    emailQueue.add({
      emailType: 'verification',
      userEmail: email,
      verificationToken,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user._doc,
        password: undefined,
        verificationToken: undefined,
        verificationTokenExpiresAt: undefined,
        __v: undefined,
        profilePhoto: undefined,
        lastLogin: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  const { code } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ApiError(400, 'Invalid or expired verification code'));
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    emailQueue.add({
      emailType: 'welcome',
      userEmail: user.email,
      name: user.firstName,
    });

    // await sendWelcomeEmail(user.email, user.firstName);
    res
      .status(200)
      .json({ success: true, messafe: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return next(new ApiError(400, 'Email or password is required'));
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiError(404, 'User does not exist!'));
    }

    if (user.isVerified === false) {
      return next(new ApiError(400, 'Email not verified!'));
    }

    // Compare passwords using bcrypt
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return next(new ApiError(400, 'Invalid credentials!'));
    }

    // Generate JWT
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.lastLogin = Date.now();
    await user.save();

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    return res
      .status(200)
      .cookie('accessToken', accessToken, {
        ...options,
        maxAge: 1 * 60 * 60 * 1000,
      })
      .cookie('refreshToken', refreshToken, {
        ...options,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: 'Login successful!', accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
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

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: 'email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'user not found' });
    }

    // reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiresAt = Date.now() + 10 * 60 * 1000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    emailQueue.add({
      emailType: 'passwordReset',
      userEmail: user.email,
      url: `${process.env.CLIENT_URL}/reset-password/${resetToken}`,
    });

    return res.status(200).json({
      success: true,
      message: 'reset password email sent',
    });
  } catch (error) {
    console.error('error in forgotPassword', error);
    res.status(500).json({ success: false, message: 'server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'input the new password',
      });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();
    emailQueue.add({
      emailType: 'resetSuccess',
      userEmail: user.email,
    });

    res
      .status(200)
      .json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('error in resetPassword', error);
    res.status(500).json({ success: false, message: 'server error' });
  }
};

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
