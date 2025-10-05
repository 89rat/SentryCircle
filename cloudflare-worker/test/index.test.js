const { unstable_dev } = require('wrangler');
const jwt = require('jsonwebtoken');

// Mock KV namespace
const mockKV = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
};

// Mock environment variables
const JWT_SECRET = 'test-jwt-secret';

describe('SentryCircle API', () => {
  let worker;

  beforeAll(async () => {
    // Start the worker in dev mode
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
      vars: { JWT_SECRET },
      bindings: { SENTRYCIRCLE_KV: mockKV },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  });

  describe('Authentication', () => {
    test('should register a new user', async () => {
      // Mock KV to simulate no existing user
      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      const resp = await worker.fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'guardian',
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.name).toBe('Test User');
      expect(data.user.role).toBe('guardian');
      expect(mockKV.put).toHaveBeenCalled();
    });

    test('should not register a user with an existing email', async () => {
      // Mock KV to simulate existing user
      mockKV.get.mockResolvedValue(JSON.stringify({
        id: 'existing-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Existing User',
        role: 'guardian',
      }));

      const resp = await worker.fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'guardian',
        }),
      });

      expect(resp.status).toBe(409);
      const data = await resp.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('User already exists');
    });

    test('should login an existing user', async () => {
      // Mock KV to simulate existing user with bcrypt hashed password
      mockKV.get.mockResolvedValue(JSON.stringify({
        id: 'user-id',
        email: 'test@example.com',
        // This is a mock bcrypt hash for 'password123'
        password: '$2a$10$JwR92oGYVWKsHsEBg1MuYuHww7pdXnpNpI7qNnM4xgZSJPCHoiB1W',
        name: 'Test User',
        role: 'guardian',
      }));

      const resp = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('test@example.com');
    });

    test('should not login with incorrect password', async () => {
      // Mock KV to simulate existing user
      mockKV.get.mockResolvedValue(JSON.stringify({
        id: 'user-id',
        email: 'test@example.com',
        // This is a mock bcrypt hash for 'password123'
        password: '$2a$10$JwR92oGYVWKsHsEBg1MuYuHww7pdXnpNpI7qNnM4xgZSJPCHoiB1W',
        name: 'Test User',
        role: 'guardian',
      }));

      const resp = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(resp.status).toBe(401);
      const data = await resp.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Invalid credentials');
    });
  });

  describe('Family Management', () => {
    test('should create a new family', async () => {
      // Mock KV operations
      mockKV.put.mockResolvedValue(undefined);
      
      // Create a valid JWT token for authentication
      const token = jwt.sign({ id: 'user-id', role: 'guardian' }, JWT_SECRET);

      const resp = await worker.fetch('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Test Family',
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data.name).toBe('Test Family');
      expect(mockKV.put).toHaveBeenCalled();
    });

    test('should not allow unauthorized family creation', async () => {
      const resp = await worker.fetch('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No authorization token
        },
        body: JSON.stringify({
          name: 'Test Family',
        }),
      });

      expect(resp.status).toBe(401);
      const data = await resp.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Child Management', () => {
    test('should add a child to a family', async () => {
      // Mock KV to simulate existing family
      mockKV.get.mockImplementation((key) => {
        if (key === 'family:family-id') {
          return JSON.stringify({
            id: 'family-id',
            name: 'Test Family',
            members: {
              'user-id': 'guardian',
            },
          });
        }
        return null;
      });
      mockKV.put.mockResolvedValue(undefined);
      
      // Create a valid JWT token for authentication
      const token = jwt.sign({ id: 'user-id', role: 'guardian' }, JWT_SECRET);

      const resp = await worker.fetch('/api/families/family-id/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Test Child',
          age: 10,
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data.name).toBe('Test Child');
      expect(mockKV.put).toHaveBeenCalled();
    });
  });

  describe('Device Management', () => {
    test('should register a device for a child', async () => {
      // Mock KV to simulate existing family and child
      mockKV.get.mockImplementation((key) => {
        if (key === 'family:family-id') {
          return JSON.stringify({
            id: 'family-id',
            name: 'Test Family',
            members: {
              'user-id': 'guardian',
            },
          });
        } else if (key === 'child:child-id') {
          return JSON.stringify({
            id: 'child-id',
            name: 'Test Child',
            familyId: 'family-id',
          });
        }
        return null;
      });
      mockKV.put.mockResolvedValue(undefined);
      
      // Create a valid JWT token for authentication
      const token = jwt.sign({ id: 'user-id', role: 'guardian' }, JWT_SECRET);

      const resp = await worker.fetch('/api/families/family-id/children/child-id/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Test Device',
          type: 'android',
          fcmToken: 'test-fcm-token',
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data.name).toBe('Test Device');
      expect(mockKV.put).toHaveBeenCalled();
    });
  });

  describe('Location Tracking', () => {
    test('should update device location', async () => {
      // Mock KV to simulate existing device
      mockKV.get.mockImplementation((key) => {
        if (key === 'device:device-id') {
          return JSON.stringify({
            id: 'device-id',
            name: 'Test Device',
            childId: 'child-id',
            familyId: 'family-id',
          });
        }
        return null;
      });
      mockKV.put.mockResolvedValue(undefined);
      
      // Create a valid JWT token for authentication (device token)
      const token = jwt.sign({ id: 'device-id', type: 'device' }, JWT_SECRET);

      const resp = await worker.fetch('/api/devices/device-id/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          timestamp: Date.now(),
        }),
      });

      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(mockKV.put).toHaveBeenCalled();
    });
  });

  describe('Command System', () => {
    test('should send a command to a device', async () => {
      // Mock KV to simulate existing family, child, and device
      mockKV.get.mockImplementation((key) => {
        if (key === 'family:family-id') {
          return JSON.stringify({
            id: 'family-id',
            name: 'Test Family',
            members: {
              'user-id': 'guardian',
            },
          });
        } else if (key === 'child:child-id') {
          return JSON.stringify({
            id: 'child-id',
            name: 'Test Child',
            familyId: 'family-id',
          });
        } else if (key === 'device:device-id') {
          return JSON.stringify({
            id: 'device-id',
            name: 'Test Device',
            childId: 'child-id',
            familyId: 'family-id',
            fcmToken: 'test-fcm-token',
          });
        }
        return null;
      });
      mockKV.put.mockResolvedValue(undefined);
      
      // Create a valid JWT token for authentication
      const token = jwt.sign({ id: 'user-id', role: 'guardian' }, JWT_SECRET);

      const resp = await worker.fetch('/api/families/family-id/children/child-id/devices/device-id/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'CHECK_IN',
          data: {
            message: 'Please check in',
          },
        }),
      });

      expect(resp.status).toBe(201);
      const data = await resp.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type');
      expect(data.type).toBe('CHECK_IN');
      expect(mockKV.put).toHaveBeenCalled();
    });
  });
});
