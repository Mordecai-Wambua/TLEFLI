import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    profilePhoto: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], required: true },
    password: { type: String, required: true },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
export default User;
