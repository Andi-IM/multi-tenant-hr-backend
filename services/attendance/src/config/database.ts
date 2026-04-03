import mongoose, { type Connection } from 'mongoose';

/**
 * Get a connection for a specific tenant database.
 * If the connection doesn't exist, it creates a new one by reusing the main application connection pool
 * but pointing to the specific tenant's database name using `useDb()`.
 */
export const getTenantConnection = (companyId: string): Connection => {
  // Normalize company ID to a valid database name (e.g., 'tenant_CompanyA')
  const dbName = `tenant_${companyId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Ensure there's a base connection first
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    const defaultUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_service_default';
    mongoose.connect(defaultUri);
  }

  // useDb creates a new connection instance attached to the specified DB using the same pool
  // with useCache: true, Mongoose will cache and reuse the connection for the same DB
  return mongoose.connection.useDb(dbName, { useCache: true });
};

/**
 * Close all tenant connections gracefully.
 */
export const closeDatabaseConnections = async () => {
  await mongoose.disconnect();
};
