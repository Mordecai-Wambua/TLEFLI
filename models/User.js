import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  profilePhoto: {
    data: Buffer,
    contentType: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  role: { type: String, enum: ['admin', 'user'], required: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
export default User;
