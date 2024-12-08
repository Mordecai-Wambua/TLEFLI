import Item from '../models/Item.js';
import { getFile } from '../utils/bucket.js';
import { ApiError } from '../utils/ApiError.js';

export async function getLostItems(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const lostItems = await Item.find({ type: 'lost' })
      .select('-__v -reported_by -type')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!lostItems || lostItems.length === 0) {
      return next(new ApiError(404, 'No lost items found!'));
    }

    const items = await Promise.all(
      lostItems.map(async (item) => {
        const itemData = item.toObject();
        itemData.itemImage = await getFile(item.itemImage);
        return itemData;
      })
    );

    const totalItems = await Item.countDocuments({
      type: 'lost',
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

export async function getFoundItems(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const foundItems = await Item.find({ type: 'found' })
      .select('-__v -reported_by -type -security')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!foundItems || foundItems.length === 0) {
      return next(new ApiError(404, 'No found items reported!'));
    }

    const items = await Promise.all(
      foundItems.map(async (item) => {
        const itemData = item.toObject();
        itemData.itemImage = await getFile(item.itemImage);
        return itemData;
      })
    );

    const totalItems = await Item.countDocuments({
      type: 'found',
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
