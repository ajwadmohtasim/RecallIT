import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

let embeddedMongo = null;

const defaultExternalUri = 'mongodb://127.0.0.1:27017/recallit';

const parseMode = () => {
  const normalized = (process.env.MONGO_MODE || 'auto').trim().toLowerCase();
  if (normalized === 'external' || normalized === 'embedded' || normalized === 'auto') return normalized;
  return 'auto';
};

const resolveEmbeddedDataPath = () => {
  const baseDir = process.env.INIT_CWD || process.cwd();
  const configuredPath = process.env.EMBEDDED_MONGO_DATA_DIR || '.local-mongo-data/embedded';
  return path.resolve(baseDir, configuredPath);
};

const connectToUri = async (mongoUri, sourceLabel) => {
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected (${sourceLabel}): ${mongoUri}`);
};

const startEmbeddedMongo = async () => {
  const dbPath = resolveEmbeddedDataPath();
  await fs.mkdir(dbPath, { recursive: true });

  const binary = {};
  if (process.env.EMBEDDED_MONGO_VERSION) {
    binary.version = process.env.EMBEDDED_MONGO_VERSION;
  }

  try {
    embeddedMongo = await MongoMemoryServer.create({
      binary,
      instance: {
        dbPath,
        dbName: process.env.EMBEDDED_MONGO_DB_NAME || 'recallit',
        storageEngine: 'wiredTiger',
      },
    });
  } catch (err) {
    err.message = `${err.message}. Embedded MongoDB failed at ${dbPath}. If this path contains data from a different MongoDB major version, set EMBEDDED_MONGO_DATA_DIR to a clean folder.`;
    throw err;
  }

  const embeddedUri = embeddedMongo.getUri();
  await connectToUri(embeddedUri, 'embedded');
  console.log(`Embedded MongoDB data path: ${dbPath}`);
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  if (embeddedMongo) {
    await embeddedMongo.stop();
    embeddedMongo = null;
  }
};

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || defaultExternalUri;
  const mode = parseMode();

  if (mode === 'embedded') {
    await startEmbeddedMongo();
    return;
  }

  try {
    await connectToUri(mongoUri, 'external');
  } catch (externalError) {
    if (mode !== 'auto') {
      externalError.message = `${externalError.message}. Failed to connect to MongoDB at ${mongoUri}. Start MongoDB, update MONGO_URI, or set MONGO_MODE=embedded.`;
      throw externalError;
    }
    console.warn(
      `Failed to connect to external MongoDB at ${mongoUri}. Falling back to embedded MongoDB.`
    );
    await startEmbeddedMongo();
  }
};
