import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import User from '../models/User.js';
import { randomNameGenerator } from '../utils/randomNames.js';
import { uploadFile, getFile, deleteFile } from '../utils/bucket.js';
import { findMatches, undoMatches } from './matching.js';
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
  try {
    const {
      type,
      itemName,
      category,
      subcategory,
      location,
      date,
      description,
      ...otherFields
    } = req.body || {};

    // Required field validation
    if (
      !type ||
      !itemName ||
      !category ||
      !subcategory ||
      !location ||
      !date ||
      !description
    ) {
      return res.status(400).json({ message: 'Required fields are missing!' });
    }

    // Validate fields
    if (!validateFields(otherFields)) {
      return res.status(400).json({ message: 'Invalid fields in request.' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    let photoData;
    let contentType;
    const imageName = randomNameGenerator();

    if (req.file) {
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
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
      ...otherFields,
    });

    await newItem.save();

    return res.status(201).json({ message: 'Item created!' });
  } catch (error) {
    console.error('Error reporting item:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateItem(req, res) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    const {
      itemName,
      category,
      subcategory,
      location,
      date,
      description,
      ...otherFields
    } = req.body || {};
    const itemImage = req.file;

    if (
      !itemName &&
      !category &&
      !subcategory &&
      !location &&
      !date &&
      !description &&
      !Object.keys(otherFields).length
    ) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    if (!validateFields(otherFields)) {
      return res.status(400).json({ message: 'Invalid fields in request.' });
    }

    if (itemName) item.itemName = itemName;
    if (category) item.category = category;
    if (subcategory) item.subcategory = subcategory;
    if (location) item.location = location;
    if (date) item.date = date;
    if (description) item.description = description;

    if (otherFields) {
      Object.assign(item, otherFields);
    }

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
    await undoMatches(item);
    await Item.findByIdAndDelete(itemId);
    return res.status(200).json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete Item Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function matchItem(req, res) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return res.status(400).json({ message: 'Invalid item ID format.' });
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    const matches = await findMatches(item);
    if (!matches || matches.length === 0) {
      return res.status(404).json({ message: 'No matches found!' });
    }

    const matchData = await Promise.all(
      matches.map(async (match) => {
        const itemData = match.item.toObject();
        itemData.itemImage = await getFile(itemData.itemImage);
        itemData.matchScore = match.score;
        return { item: itemData };
      })
    );
    return res.status(200).json({ matchData });
  } catch (error) {
    console.error('Match Item Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

function validateID(id) {
  return mongoose.isValidObjectId(id);
}

// Function to validate the fields in the request
function validateFields(fields) {
  const validFields = [
    'brand',
    'model',
    'color',
    'keyType',
    'numberOfKeys',
    'idType',
    'issuingAuthority',
    'expirationDate',
    'passportCountry',
    'creditCardIssuer',
    'lastFourDigits',
    'bookTitle',
    'author',
    'isbn',
    'documentType',
    'createdAt',
    'updatedAt',
    'status',
  ];
  return Object.keys(fields).every((field) => validFields.includes(field));
}
