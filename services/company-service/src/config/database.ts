import mongoose, { Connection } from 'mongoose';

const isTest = process.env.NODE_ENV === 'test';

const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'COMPANY_ID'];
const missing = requiredVars.filter((v) => !process.env[v]);

if (!isTest && missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

/**
 * Get the database connection.
 * Simple singleton connection based on MONGODB_URI.
 */
export const getDatabaseConnection = (): Connection => {
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is required but not defined');
    }
    mongoose.connect(uri);
  }

  return mongoose.connection;
};

/**
 * Close all tenant connections gracefully.
 */
export const closeDatabaseConnections = async () => {
  await mongoose.disconnect();
};
