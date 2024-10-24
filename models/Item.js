import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  dateLost: { type: Date, required: true },
  description: { type: String, required: true, unique: true },
  itemImage: {
    data: Buffer,
    contentType: String,
  },
  reportedDate: { type: Date, default: Date.now },
  reported_by: {
    userName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
});

const Item = mongoose.model('Item', ItemSchema);
export default Item;
