import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock API calls
jest.mock('../api', () => ({
  api: {
    post: jest.fn((url, data) => {
      if (url === '/api/auth/login') {
        if (data.email === 'test@example.com' && data.password === 'password123') {
          return Promise.resolve({
            data: {
              token: 'test-token',
              user: {
                id: 'user-id',
                email: 'test@example.com',
                name: 'Test User',
                role: 'guardian',
              },
            },
          });
        } else {
          return Promise.reject({ response: { data: { error: 'Invalid credentials' } } });
        }
      }
      return Promise.reject(new Error('Not implemented'));
    }),
    get: jest.fn((url) => {
      if (url === '/api/families') {
        return Promise.resolve({
          data: [
            {
              id: 'family-id',
              name: 'Test Family',
              members: {
                'user-id': 'guardian',
              },
            },
          ],
        });
      } else if (url === '/api/families/family-id/children') {
        return Promise.resolve({
          data: [
            {
              id: 'child-id',
              name: 'Test Child',
              age: 10,
              familyId: 'family-id',
            },
          ],
        });
      }
      return Promise.reject(new Error('Not implemented'));
    }),
  },
}));

// Mock local storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('renders login page when not authenticated', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/Welcome to SentryCircle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('logs in successfully with correct credentials', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    
    // Fill in login form
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
    
    // Check that token was stored
    expect(localStorageMock.getItem('token')).toBe('test-token');
  });

  it('shows error message with incorrect credentials', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    
    // Fill in login form with incorrect password
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard when authenticated', async () => {
    // Set token in localStorage to simulate authenticated state
    localStorageMock.setItem('token', 'test-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'guardian',
    }));
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
    
    // Check that family data is loaded
    await waitFor(() => {
      expect(screen.getByText(/Test Family/i)).toBeInTheDocument();
    });
  });

  it('logs out successfully', async () => {
    // Set token in localStorage to simulate authenticated state
    localStorageMock.setItem('token', 'test-token');
    localStorageMock.setItem('user', JSON.stringify({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'guardian',
    }));
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
    
    // Click logout button
    fireEvent.click(screen.getByText(/Logout/i));
    
    // Wait for login page to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome to SentryCircle/i)).toBeInTheDocument();
    });
    
    // Check that token was removed
    expect(localStorageMock.getItem('token')).toBeNull();
  });
});
