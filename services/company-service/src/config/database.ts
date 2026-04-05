import mongoose, { Connection } from 'mongoose';

/**
 * Get the database connection.
 * Simple singleton connection based on MONGODB_URI.
 */
export const getDatabaseConnection = (): Connection => {
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    const defaultUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/company_service_default';
    mongoose.connect(defaultUri);
  }

  return mongoose.connection;
};

/**
 * Close all tenant connections gracefully.
 */
export const closeDatabaseConnections = async () => {
  await mongoose.disconnect();
};
