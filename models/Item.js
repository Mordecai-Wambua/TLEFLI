import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  type: { type: String, enum: ['lost', 'found'], required: true, index: true },
  itemName: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  reported_by: {
    userName: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  itemImage: { type: String, required: true },
  security: {
    question: { type: String },
    answer: { type: String },
  },

  brand: { type: String },
  model: { type: String },
  color: { type: String },
  description: { type: String },

  // Fields for specific categories
  keyType: { type: String },
  numberOfKeys: { type: Number },
  idType: { type: String },
  issuingAuthority: { type: String },
  expirationDate: { type: Date },
  passportCountry: { type: String },
  creditCardIssuer: { type: String },
  lastFourDigits: { type: Number },
  bookTitle: { type: String },
  author: { type: String },
  isbn: { type: String },
  documentType: { type: String },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: [
      'Registered Object',
      'Authentication In Progress',
      'Authentication Verified',
      'Return In Progress',
      'Object Returned',
    ],
    default: 'Registered Object',
    index: true,
  },
});

// Create a text index for better search capabilities
ItemSchema.index({
  itemName: 'text',
  description: 'text',
  category: 'text',
  subcategory: 'text',
  location: 'text',
});

// Add a pre-save hook to update the 'updatedAt' field
ItemSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Item = mongoose.model('Item', ItemSchema);
export default Item;
