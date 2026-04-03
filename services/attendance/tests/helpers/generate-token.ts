import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

export function generateTestToken(
  payload: {
    id?: string;
    role?: string;
    companyId?: string;
  } = {}
) {
  const defaultPayload = {
    id: 'test-user-123',
    role: 'EMPLOYEE',
    companyId: 'company-A',
    ...payload,
  };

  return jwt.sign(defaultPayload, JWT_SECRET, { expiresIn: '1h' });
}
