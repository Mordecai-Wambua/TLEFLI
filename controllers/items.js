import Item from '../models/Item.js';
import { getFile } from '../utils/bucket.js';

export async function getLostItems(req, res) {
  try {
    const lostItems = await Item.find({ type: 'lost' });

    if (!lostItems || lostItems.length === 0) {
      return res.status(404).json({ message: 'No lost items found!' });
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
    console.error('Error fetching lost items:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
