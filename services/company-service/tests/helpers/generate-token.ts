import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export function generateTestToken(
  payload: {
    userId?: string;
    email?: string;
    role?: string;
    companyId?: string;
  } = {}
) {
  const defaultPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'ADMIN_HR',
    companyId: 'A',
    ...payload,
  };

  return jwt.sign(defaultPayload, JWT_SECRET, { expiresIn: '1h' });
}
