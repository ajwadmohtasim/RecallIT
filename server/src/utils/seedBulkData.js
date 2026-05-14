import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { User } from '../models/User.js';

dotenv.config();

const TOPICS = [
  'Pointers',
  'Concurrency',
  'Graph Theory',
  'Dynamic Programming',
  'Memory Model',
  'Networking',
  'Databases',
  'Recursion',
  'Trees',
  'Hashing',
  'Sorting',
  'Greedy Methods',
  'Bit Manipulation',
  'OS Scheduling',
  'Complexity Analysis',
  'Testing',
  'Debugging',
  'Caching',
  'Distributed Systems',
  'APIs',
];

const VERBS = ['explain', 'compare', 'derive', 'outline', 'analyze', 'justify', 'summarize', 'evaluate'];

const DECK_CONFIG = [
  { name: 'Arena Fundamentals', description: 'High-volume generated deck: Arena Fundamentals' },
  { name: 'Arena Algorithms', description: 'High-volume generated deck: Arena Algorithms' },
  { name: 'Arena Systems', description: 'High-volume generated deck: Arena Systems' },
  { name: 'Arena Mixed Drills', description: 'High-volume generated deck: Arena Mixed Drills' },
];

const BULK_TAG = 'bulk-seed-v1';
const CARDS_PER_DECK = Number(process.env.BULK_SEED_CARDS_PER_DECK || 250);

const makeCardPayload = ({ deckName, index }) => {
  const topic = TOPICS[(index * 7) % TOPICS.length];
  const verb = VERBS[(index * 5) % VERBS.length];
  const difficulty = (index % 4) + 1;
  const title = `${topic} Drill ${index}`;
  const question = `Seed ${deckName} #${index}: ${verb} ${topic} with one practical example and one common mistake.`;
  const answer = `Focus on ${topic}. Practical example ${index} in ${deckName}. Common mistake: skipping constraints and edge cases. Difficulty band ${difficulty}.`;

  return {
    title,
    question,
    answer,
    tags: [BULK_TAG, 'generated', topic.toLowerCase().replace(/\s+/g, '-'), `d${difficulty}`],
  };
};

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
    console.log(`Created user ${seedEmail}`);
  }

  let insertedTotal = 0;

  for (const deckConfig of DECK_CONFIG) {
    let deck = await Deck.findOne({ owner: user._id, name: deckConfig.name });
    if (!deck) {
      deck = await Deck.create({
        owner: user._id,
        name: deckConfig.name,
        description: deckConfig.description,
      });
      console.log(`Created deck: ${deckConfig.name}`);
    }

    const generatedCards = [];
    for (let i = 1; i <= CARDS_PER_DECK; i += 1) {
      generatedCards.push(makeCardPayload({ deckName: deckConfig.name, index: i }));
    }

    const existing = await Card.find(
      { owner: user._id, deck: deck._id, tags: BULK_TAG },
      { question: 1 }
    ).lean();
    const existingQuestions = new Set(existing.map((card) => card.question));

    const toInsert = generatedCards
      .filter((entry) => !existingQuestions.has(entry.question))
      .map((entry) => ({
        owner: user._id,
        deck: deck._id,
        ...entry,
      }));

    if (toInsert.length > 0) {
      await Card.insertMany(toInsert, { ordered: false });
      insertedTotal += toInsert.length;
    }

    const totalDeckCards = await Card.countDocuments({ owner: user._id, deck: deck._id });
    console.log(`${deckConfig.name}: inserted ${toInsert.length}, total now ${totalDeckCards}`);
  }

  console.log(
    `Bulk seed complete. Added ${insertedTotal} cards. Login: ${seedEmail} / ${seedPassword}. Marker tag: ${BULK_TAG}`
  );
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
