import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import User from '../models/User.js';
import { randomNameGenerator } from '../utils/randomNames.js';
import { uploadFile, getFile, deleteFile } from '../utils/bucket.js';
const defaultItemPhotoPath = path.resolve('utils', 'item.jpg');

export async function getItems(req, res) {
  try {
    const userId = req.user.id;
    const lostItems = await Item.find({ 'reported_by.userId': userId }).select(
      '-__v -reported_by'
    );

    if (!lostItems || lostItems.length === 0) {
      return res.status(404).json({ message: 'No items found!' });
    }

    const items = await Promise.all(
      lostItems.map(async (item) => {
        const itemData = item.toObject();
        itemData.itemImage = await getFile(item.itemImage); // Await getFile here
        return itemData;
      })
    );

    return res.status(200).json({ items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function getItem(req, res) {
  const itemId = req.params.id;
  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  try {
    const item = await Item.findById(itemId).select('-__v -reported_by');
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    const itemData = item.toObject();
    itemData.itemImage = await getFile(item.itemImage);

    return res.status(200).json({ item: itemData });
  } catch (error) {
    console.error('Error fetching lost item:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function reportItem(req, res) {
  const { type, itemName, category, subcategory, location, date, description } =
    req.body || {};

  try {
    if (
      (!type,
      !itemName,
      !category,
      !subcategory,
      !location,
      !date,
      !description)
    ) {
      return res.status(400).json({ message: 'All fields are required!' });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);

    let photoData;
    let contentType;
    const imageName = randomNameGenerator();

    if (req.file) {
      console.log('User uploaded an item photo');
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
      console.log('No file uploaded, using default item photo');
      photoData = fs.readFileSync(defaultItemPhotoPath);
      contentType = 'image/jpeg';
    }

    await uploadFile({ photoData, contentType }, imageName);

    const newItem = new Item({
      type,
      itemName,
      category,
      subcategory,
      location,
      date,
      description,
      reported_by: { userName: user.firstName, userId: user._id },
      itemImage: imageName,
    });

    await newItem.save();
    return res.status(201).json({ message: 'Item created!' });
  } catch (error) {
    console.log(error);
    console.error('Reporting lost item Error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateItem(req, res) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  const { itemName, category, subcategory, location, date, description } =
    req.body || {};
  const itemImage = req.file;

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    if (
      !itemName &&
      !category &&
      !subcategory &&
      !location &&
      !date &&
      !description &&
      !itemImage
    ) {
      return res
        .status(400)
        .json({ message: 'At least one field is required!' });
    }

    if (itemName) item.itemName = itemName;
    if (category) item.category = category;
    if (subcategory) item.subcategory = subcategory;
    if (location) item.location = location;
    if (date) item.date = date;
    if (description) item.description = description;

    if (itemImage) {
      try {
        const imageName = item.itemImage;
        const photoData = itemImage.buffer;
        const contentType = itemImage.mimetype;
        await uploadFile({ photoData, contentType }, imageName);
        item.itemImage = imageName;
      } catch (uploadError) {
        console.error('Error uploading the item photo:', uploadError);
        return res.status(500).json({ message: 'Error uploading item photo' });
      }
    }

    await item.save();
    return res.status(200).json({ message: 'Item details updated' });
  } catch (error) {
    console.error('Update Item details Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteItem(req, res) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    await deleteFile(item.itemImage);
    await Item.findByIdAndDelete(itemId);
    return res.status(200).json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete Item Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

function validateID(id) {
  return mongoose.isValidObjectId(id);
}
