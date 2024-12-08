import Item from '../models/Item.js';
import { ApiError } from './ApiError.js';

// Helper function for case-insensitive comparison
function compareStrings(str1, str2) {
  return str1?.toLowerCase() === str2?.toLowerCase();
}

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

  // Brand and model match (optimized with helper function)
  if (compareStrings(item1.brand, item2.brand)) score += 10;
  if (compareStrings(item1.model, item2.model)) score += 10;

  // Color match
  if (compareStrings(item1.color, item2.color)) score += 10;

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
      'reported_by.userId': { $ne: newItem.reported_by.userId },
    }).select('-__v -reported_by -security');

    if (!potentialMatches || potentialMatches.length === 0) {
      return [];
    }

    const matches = potentialMatches.reduce((validMatches, item) => {
      const score = calculateMatchScore(newItem, item);
      if (score >= 80) {
        validMatches.push({ item, score });
      }
      return validMatches;
    }, []);

    if (matches.length === 0) {
      return [];
    }

    const matchIds = matches
      .filter((match) => match.item.status === 'Registered Object')
      .map((match) => match.item._id);

    if (matchIds.length > 0) {
      try {
        const result = await Item.updateMany(
          { _id: { $in: matchIds } },
          { $set: { status: 'Authentication In Progress' } }
        );
        matches.forEach((match) => {
          if (matchIds.includes(match.item._id)) {
            match.item.status = 'Authentication In Progress';
          }
        });
      } catch (updateError) {
        console.error('Error updating status for matches:', updateError);
      }
    }

    return matches;
  } catch (fetchError) {
    throw new ApiError(500, fetchError.message);
  }
}

export async function undoMatches(newItem) {
  const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';

  try {
    const potentialMatches = await Item.find({
      type: oppositeType,
      category: newItem.category,
      subcategory: newItem.subcategory,
      'reported_by.userId': { $ne: newItem.reported_by.userId },
    }).select('-__v -reported_by');

    if (!potentialMatches || potentialMatches.length === 0) {
      return [];
    }

    const matches = potentialMatches
      .map((item) => ({
        item,
        score: calculateMatchScore(newItem, item),
      }))
      .filter((match) => match.score >= 80);

    if (matches.length === 0) {
      return [];
    }

    const matchIds = matches
      .filter((match) => match.item.status !== 'Registered Object')
      .map((match) => match.item._id);

    if (matchIds.length > 0) {
      try {
        const result = await Item.updateMany(
          { _id: { $in: matchIds } },
          { $set: { status: 'Registered Object' } }
        );
      } catch (updateError) {
        throw new Error('Error updating status for matches.');
      }
    } else {
      console.log('No matches needed to be undone.');
    }
  } catch (fetchError) {
    throw new ApiError(500, fetchError.message);
  }
}
