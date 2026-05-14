import { Router } from 'express';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

const router = Router();

const normalizeTags = (value) => {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(items.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))].slice(0, 12);
};

router.get('/', async (req, res, next) => {
  try {
    const deckId = req.query.deckId;
    if (!deckId) {
      return res.status(400).json({ message: 'deckId query param is required.' });
    }

    const cards = await Card.find({ owner: req.user.id, deck: deckId })
      .sort({ createdAt: -1 })
      .select('_id title question answer tags due createdAt updatedAt')
      .lean();

    res.json(cards);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { deckId, title, question, answer } = req.body;
    const tags = normalizeTags(req.body?.tags);

    if (!deckId || !question?.trim() || !answer?.trim()) {
      return res.status(400).json({ message: 'deckId, question and answer are required.' });
    }

    const deck = await Deck.findOne({ _id: deckId, owner: req.user.id });
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found.' });
    }

    const card = await Card.create({
      owner: req.user.id,
      deck: deckId,
      title: title?.trim() || '',
      question: question.trim(),
      answer: answer.trim(),
      tags,
    });

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

router.put('/:cardId', async (req, res, next) => {
  try {
    const title = req.body?.title?.trim();
    const question = req.body?.question?.trim();
    const answer = req.body?.answer?.trim();
    const tags = normalizeTags(req.body?.tags);

    if (!question || !answer) {
      return res.status(400).json({ message: 'question and answer are required.' });
    }

    const card = await Card.findOne({ _id: req.params.cardId, owner: req.user.id });
    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }

    card.history = [
      {
        title: card.title || '',
        question: card.question,
        answer: card.answer,
        tags: card.tags || [],
        editedAt: new Date(),
      },
      ...(card.history || []),
    ].slice(0, 20);

    card.title = title || '';
    card.question = question;
    card.answer = answer;
    card.tags = tags;

    await card.save();

    res.json({
      _id: card._id,
      title: card.title,
      question: card.question,
      answer: card.answer,
      tags: card.tags,
      due: card.due,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:cardId', async (req, res, next) => {
  try {
    const card = await Card.findOne({ _id: req.params.cardId, owner: req.user.id });
    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }

    await card.deleteOne();
    res.json({ message: 'Card deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;