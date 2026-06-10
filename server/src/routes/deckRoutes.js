import { Router } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    const decks = await Deck.find({ owner: ownerObjectId }).sort({ createdAt: -1 }).lean();

    const deckIds = decks.map((d) => d._id);
    const now = new Date();

    const [totalCounts, dueCounts] = await Promise.all([
      Card.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds } } },
        { $group: { _id: '$deck', count: { $sum: 1 } } },
      ]),
      Card.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds }, due: { $lte: now } } },
        { $group: { _id: '$deck', count: { $sum: 1 } } },
      ]),
    ]);

    const totalMap = Object.fromEntries(totalCounts.map((x) => [String(x._id), x.count]));
    const dueMap = Object.fromEntries(dueCounts.map((x) => [String(x._id), x.count]));

    const output = decks.map((deck) => ({
      ...deck,
      totalCards: totalMap[String(deck._id)] || 0,
      dueCards: dueMap[String(deck._id)] || 0,
    }));

    res.json(output);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Deck name is required.' });
    }

    const deck = await Deck.create({
      owner: req.user.id,
      name: name.trim(),
      description: description.trim(),
    });

    res.status(201).json(deck);
  } catch (err) {
    next(err);
  }
});

export default router;
