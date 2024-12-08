import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import User from '../models/User.js';
import { randomNameGenerator } from '../utils/randomNames.js';
import { uploadFile, getFile, deleteFile } from '../utils/bucket.js';
import { findMatches, undoMatches } from '../utils/matching.js';
import { verifySecurityAnswer } from '../utils/nlp.js';
import { ApiError } from '../utils/ApiError.js';
const defaultItemPhotoPath = path.resolve('utils', 'item.jpg');

export async function getItems(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Directly apply pagination and sort
    const lostItems = await Item.find({ 'reported_by.userId': userId })
      .select('-__v -reported_by')
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!lostItems || lostItems.length === 0) {
      return next(new ApiError(404, 'No items found!'));
    }

    // Fetch images in parallel
    const items = await Promise.all(
      lostItems.map(async (item) => {
        const itemData = item.toObject();
        // Retrieve the item image in parallel
        itemData.itemImage = await getFile(item.itemImage);
        return itemData;
      })
    );

    // Retrieve total items count
    const totalItems = await Item.countDocuments({
      'reported_by.userId': userId,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getItem(req, res, next) {
  const itemId = req.params.id;
  if (!validateID(itemId)) {
    return next(new ApiError(400, 'Invalid item ID format.'));
  }

  try {
    const item = await Item.findById(itemId).select('-__v -reported_by');
    if (!item) {
      return next(new ApiError(404, 'Item not found!'));
    }

    const itemData = item.toObject();
    itemData.itemImage = await getFile(item.itemImage);

    return res.status(200).json({ item: itemData });
  } catch (error) {
    next(error);
  }
}

export async function reportItem(req, res, next) {
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
      return next(new ApiError(400, 'Required fields are missing!'));
    }

    // Validate fields
    if (!validateFields(otherFields)) {
      return next(new ApiError(400, 'Invalid fields in request.'));
    }

    const userId = req.user.id;

    const existingItem = await Item.findOne({
      type,
      itemName,
      category,
      subcategory,
      location,
      description,
      ...otherFields,
      'reported_by.userId': userId,
    });

    if (existingItem) {
      return next(new ApiError(409, 'Item already reported by you!'));
    }

    const user = await User.findById(userId);
    const imageName = randomNameGenerator();
    const photoData = req.file
      ? req.file.buffer
      : fs.readFileSync(defaultItemPhotoPath);
    const contentType = req.file ? req.file.mimetype : 'image/jpeg';
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
    next(error);
  }
}

export async function updateItem(req, res, next) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return next(new ApiError(400, 'Invalid item ID format.'));
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return next(new ApiError(404, 'Item not found!'));
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
      return next(new ApiError(400, 'No fields provided to update.'));
    }

    if (!validateFields(otherFields)) {
      return next(new ApiError(400, 'Invalid fields in request.'));
    }

    Object.assign(item, {
      itemName,
      category,
      subcategory,
      location,
      date,
      description,
      ...otherFields,
    });

    if (itemImage) {
      const imageName = item.itemImage;
      await uploadFile(
        { photoData: itemImage.buffer, contentType: itemImage.mimetype },
        imageName
      );
      item.itemImage = imageName;
    }

    await item.save();
    return res.status(200).json({ message: 'Item details updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req, res, next) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return next(new ApiError(400, 'Invalid item ID format.'));
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return next(new ApiError(404, 'Item not found!'));
    }

    await deleteFile(item.itemImage);
    await undoMatches(item);
    await Item.findByIdAndDelete(itemId);
    return res.status(200).json({ message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
}

export async function matchItem(req, res, next) {
  const itemId = req.params.id;

  if (!validateID(itemId)) {
    return next(new ApiError(400, 'Invalid item ID format.'));
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return next(new ApiError(404, 'Item not found!'));
    }

    const matches = await findMatches(item);
    if (!matches || matches.length === 0) {
      return next(new ApiError(404, 'No matches found!'));
    }

    item.status = 'Authentication In Progress';
    await item.save();

    const matchData = await Promise.all(
      matches.map(async (match) => ({
        item: {
          ...match.item.toObject(),
          itemImage: await getFile(match.item.itemImage),
          matchScore: match.score,
        },
      }))
    );
    return res.status(200).json({ matchData });
  } catch (error) {
    next(error);
  }
}

export async function verifyMatchQuestion(req, res, next) {
  const matchId = req.params.mid;

  if (!validateID(matchId)) {
    return next(new ApiError(400, `Invalid match ID format: ${matchId}.`));
  }

  try {
    const item = await Item.findById(matchId);

    if (!item) {
      return next(new ApiError(404, `Item not found for matchId=${matchId}`));
    }

    if (!item.security || !item.security.question) {
      return next(
        new ApiError(
          400,
          `Security question not available for matchId=${matchId}`
        )
      );
    }

    const securityQuestion = item.security.question;
    return res.status(200).json({ securityQuestion });
  } catch (error) {
    next(error);
  }
}

export async function verifyMatchAnswer(req, res, next) {
  const itemId = req.params.id;
  const matchId = req.params.mid;
  const answer = req.body.answer;

  if (!validateID(matchId)) {
    return next(new ApiError(400, 'Invalid match ID format.'));
  }

  try {
    const matchedItem = await Item.findById(matchId);
    const item = await Item.findById(itemId);
    if (!matchedItem || !item) {
      return next(new ApiError(404, 'Item not found!'));
    }

    if (!matchedItem.security || !matchedItem.security.answer) {
      return next(
        new ApiError(
          400,
          `Security answer not available for matchId=${matchId}.`
        )
      );
    }
    const securityAnswer = matchedItem.security.answer;
    const similarity = await verifySecurityAnswer(answer, securityAnswer);
    if (similarity) {
      if (
        matchedItem.status !== 'Authentication Verified' &&
        matchedItem.status !== 'Return In Progress' &&
        matchedItem.status !== 'Object Returned'
      ) {
        await Item.updateMany(
          { _id: { $in: [matchedItem._id, item._id] } },
          { $set: { status: 'Authentication Verified' } }
        );
      }
      return res.status(200).json({ message: 'Successfully verified' });
    }
    return res.status(200).json({ message: 'Failed verification' });
  } catch (error) {
    next(error);
  }
}

function validateID(id) {
  return mongoose.isValidObjectId(id);
}

// Function to validate the fields in the request
function validateFields(fields) {
  const validFields = [
    'type',
    'itemName',
    'date',
    'location',
    'category',
    'subcategory',
    'description',
    'security.question',
    'security.answer',
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

  // Helper function to check nested fields
  function checkNestedFields(fields, prefix = '') {
    return Object.keys(fields).every((field) => {
      const fullFieldName = prefix ? `${prefix}.${field}` : field;

      // If the value is an object, recurse through it
      if (typeof fields[field] === 'object' && fields[field] !== null) {
        return checkNestedFields(fields[field], fullFieldName);
      }

      // Check if the field exists in the valid fields list
      return validFields.includes(fullFieldName);
    });
  }

  // Start validating from the top-level fields
  return checkNestedFields(fields);
}
