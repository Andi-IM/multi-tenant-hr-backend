import mongoose, { Connection } from 'mongoose';

// Cache database connections so we don't recreate them on every request
const connectionCache: Record<string, Connection> = {};

/**
 * Get a connection for a specific tenant database.
 * If the connection doesn't exist, it creates a new one by reusing the main application connection pool
 * but pointing to the specific tenant's database name using `useDb()`.
 */
export const getTenantConnection = (companyId: string): Connection => {
  // Normalize company ID to a valid database name (e.g., 'tenant_CompanyA')
  const dbName = `tenant_${companyId.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (connectionCache[dbName]) {
    return connectionCache[dbName];
  }

  // Ensure there's a base connection first
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    const defaultUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/company_service_default';
    mongoose.connect(defaultUri);
  }

  // useDb creates a new connection instance attached to the specified DB using the same pool
  const tenantConnection = mongoose.connection.useDb(dbName, { useCache: true });
  connectionCache[dbName] = tenantConnection;

  return tenantConnection;
};

/**
 * Close all tenant connections gracefully.
 */
export const closeDatabaseConnections = async () => {
  await mongoose.disconnect();
};
