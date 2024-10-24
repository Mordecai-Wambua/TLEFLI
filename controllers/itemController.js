import path from 'path';
import fs from 'fs';
import Item from '../models/Item.js';
import User from '../models/User.js';
const defaultItemPhotoPath = path.resolve('utils', 'item.jpg');

export async function getLostItems(req, res) {
  try {
    const userId = req.user.id;
    const lostItems = await Item.find({ 'reported_by.userId': userId });

    if (!lostItems || lostItems.length === 0) {
      return res.status(404).json({ message: 'No lost items found!' });
    }

    const items = lostItems.map((item) => {
      const base64Photo = Buffer.from(item.itemImage.data).toString('base64');

      const photoData = `data:${item.itemImage.contentType};base64,${base64Photo}`;

      return {
        id: item._id,
        name: item.name,
        category: item.category,
        dateLost: item.dateLost,
        description: item.description,
        reportedDate: item.reportedDate,
        itemPhoto: photoData,
      };
    });

    return res.status(200).json({ items });
  } catch (error) {
    console.error('Error fetching lost items:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function reportLostItem(req, res) {
  const { name, category, location, dateLost, description } = req.body || {};

  try {
    if ((!name, !category, !location, !dateLost, !description)) {
      return res.status(400).json({ message: 'All fields are required!' });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);

    let photoData;
    let contentType;

    if (req.file) {
      console.log('User uploaded profile photo:', req.file);
      photoData = req.file.buffer;
      contentType = req.file.mimetype;
    } else {
      console.log('No file uploaded, using default profile photo');
      photoData = fs.readFileSync(defaultItemPhotoPath);
      contentType = 'image/jpeg';
    }

    const newItem = new Item({
      name,
      category,
      location,
      dateLost,
      description,
      reported_by: { userName: user.firstName, userId: user._id },
      itemImage: {
        data: photoData,
        contentType: contentType,
      },
    });

    await newItem.save();
    return res.status(201).json({ message: 'Item created!' });
  } catch (error) {
    console.log(error);
    console.error('Reporting lost item Error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateLostItem(req, res) {
  const itemId = req.params.id;
  const { name, category, location, dateLost, description } = req.body || {};

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found!' });
    }

    if (
      !name &&
      !category &&
      !location &&
      !dateLost &&
      !description &&
      !req.file
    ) {
      return res
        .status(400)
        .json({ message: 'At least one field is required!' });
    }

    if (name) item.name = name;
    if (category) item.category = category;
    if (location) item.location = location;
    if (dateLost) item.dateLost = dateLost;
    if (description) item.description = description;

    if (req.file) {
      const photoData = req.file.buffer;
      const contentType = req.file.mimetype;
      item.itemImage = {
        data: photoData,
        contentType: contentType,
      };
    }

    await item.save();
    return res.status(200).json({ message: 'Item details updated' });
  } catch (error) {
    console.error('Update Item details Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
