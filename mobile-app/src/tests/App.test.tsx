import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('@react-native-firebase/app', () => {
  return () => ({
    onNotification: jest.fn(),
    onNotificationOpened: jest.fn(),
    onTokenRefresh: jest.fn(),
  });
});

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
  });
});

jest.mock('@react-native-firebase/firestore', () => {
  return () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({
            name: 'Test User',
            role: 'child',
          }),
        })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
      })),
    })),
  });
});

jest.mock('../hooks/useMonitoring', () => {
  return () => ({
    startMonitoring: jest.fn(() => Promise.resolve()),
    stopMonitoring: jest.fn(() => Promise.resolve()),
    isMonitoring: false,
  });
});

describe('App', () => {
  it('renders correctly', async () => {
    const { getByText } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    
    // Wait for the app to load
    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });
  });

  it('navigates to registration screen', async () => {
    const { getByText } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    
    // Wait for the app to load
    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });
    
    // Navigate to registration
    fireEvent.press(getByText('Create an account'));
    
    await waitFor(() => {
      expect(getByText('Register')).toBeTruthy();
    });
  });

  it('shows error on invalid login', async () => {
    // Mock the auth module to reject login
    jest.mock('@react-native-firebase/auth', () => {
      return () => ({
        signInWithEmailAndPassword: jest.fn(() => Promise.reject(new Error('Invalid credentials'))),
        onAuthStateChanged: jest.fn((callback) => {
          callback(null);
          return jest.fn();
        }),
      });
    });
    
    const { getByText, getByPlaceholderText } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    
    // Wait for the app to load
    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });
    
    // Fill in login form
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    
    // Submit form
    fireEvent.press(getByText('Login'));
    
    // Check for error message
    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
