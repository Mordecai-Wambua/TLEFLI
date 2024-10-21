import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  itemName: { type: String, required: true },
  itemCategory: { type: String, required: true },
  description: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Item = mongoose.model('Item', ItemSchema);
export default Item;
