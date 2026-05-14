import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { User } from '../models/User.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  const seedEmail = (process.env.SEED_EMAIL || 'demo@recallit.dev').toLowerCase();
  const seedPassword = process.env.SEED_PASSWORD || 'password123';
  const seedName = process.env.SEED_NAME || 'Demo User';

  let user = await User.findOne({ email: seedEmail });

  if (!user) {
    const passwordHash = await bcrypt.hash(seedPassword, 10);
    user = await User.create({
      name: seedName,
      email: seedEmail,
      passwordHash,
    });
  }

  const deckName = 'C++ Advanced';
  let deck = await Deck.findOne({ owner: user._id, name: deckName });

  if (!deck) {
    deck = await Deck.create({
      owner: user._id,
      name: deckName,
      description: 'Templates, memory model, move semantics, and STL internals.',
    });
  }

  const sampleCards = [
    {
      title: 'std::move',
      tags: ['cpp', 'move-semantics'],
      question: 'What is the purpose of std::move in C++?',
      answer: 'It casts an object to an rvalue reference, enabling move semantics when supported.',
    },
    {
      title: 'RAII',
      tags: ['cpp', 'memory'],
      question: 'What does RAII stand for and why is it useful?',
      answer: 'Resource Acquisition Is Initialization; it binds resource lifetime to object lifetime for safe cleanup.',
    },
    {
      title: 'Vector Reallocation',
      tags: ['cpp', 'stl'],
      question: 'Why can vector reallocation invalidate iterators?',
      answer: 'Reallocation moves elements to new memory, so old addresses and iterators become invalid.',
    },
    {
      title: 'shared_ptr Cycles',
      tags: ['cpp', 'memory'],
      question: 'What problem do std::shared_ptr cycles cause?',
      answer: 'Reference cycles prevent reference counts from reaching zero, leading to memory leaks.',
    },
  ];

  for (const entry of sampleCards) {
    const exists = await Card.findOne({ owner: user._id, deck: deck._id, question: entry.question });
    if (!exists) {
      await Card.create({
        owner: user._id,
        deck: deck._id,
        title: entry.title,
        tags: entry.tags,
        question: entry.question,
        answer: entry.answer,
      });
    }
  }

  console.log(`Seed complete. Demo login: ${seedEmail} / ${seedPassword}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});