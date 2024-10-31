import Item from '../models/Item.js';

function calculateMatchScore(item1, item2) {
  let score = 0;

  // Category and subcategory match
  if (item1.category === item2.category) score += 20;
  if (item1.subcategory === item2.subcategory) score += 10;

  // Location proximity (simplified)
  if (item1.location === item2.location) score += 20;

  // Date proximity
  const dateDiff = Math.abs(new Date(item1.date) - new Date(item2.date));
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
  if (daysDiff <= 1) score += 20;
  else if (daysDiff <= 7) score += 10;

  // Brand and model match
  if (item1.brand?.toLowerCase() === item2.brand?.toLowerCase()) score += 10;
  if (item1.model?.toLowerCase() === item2.model?.toLowerCase()) score += 10;

  // Color match
  if (item1.color?.toLowerCase() === item2.color?.toLowerCase()) score += 10;

  // Description similarity (simplified)
  if (item1.description && item2.description) {
    const words1 = item1.description.toLowerCase().split(' ');
    const words2 = item2.description.toLowerCase().split(' ');
    const commonWords = words1.filter((word) => words2.includes(word));
    score += Math.min(commonWords.length * 2, 20); // Max 20 points for description
  }

  return score;
}

export async function findMatches(newItem) {
  const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';
  try {
    const potentialMatches = await Item.find({
      type: oppositeType,
      category: newItem.category,
      subcategory: newItem.subcategory,
    }).select('-__v -reported_by');

    const matches = potentialMatches
      .map((item) => ({
        item,
        score: calculateMatchScore(newItem, item),
      }))
      .filter((match) => match.score >= 80);

    for (const match of matches) {
      if (match.item.status !== 'Authentication In Progress') {
        try {
          await Item.updateOne(
            { _id: match.item._id },
            { $set: { status: 'Authentication In Progress' } }
          );
          console.log(`Updated status for item: ${match.item._id}`);
        } catch (updateError) {
          console.error(
            `Error updating status for match ${match.item._id}:`,
            updateError
          );
        }
      }
    }

    return matches;
  } catch (fetchError) {
    console.error('Error fetching potential matches:', fetchError);
    throw new Error('Could not retrieve potential matches at this time.');
  }
}
