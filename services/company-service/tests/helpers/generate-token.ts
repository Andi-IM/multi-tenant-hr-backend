import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

export function generateTestToken(payload: {
  userId?: string;
  role?: string;
  companyId?: string;
} = {}) {
  const defaultPayload = {
    userId: 'test-user-123',
    role: 'ADMIN_HR',
    companyId: 'A',
    ...payload,
  };

  return jwt.sign(defaultPayload, JWT_SECRET, { expiresIn: '1h' });
}
