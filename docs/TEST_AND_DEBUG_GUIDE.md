# SentryCircle: Test and Debug Guide

This guide provides comprehensive instructions for testing and debugging the SentryCircle application across all components: Cloudflare Worker backend, React Native mobile app, and React web dashboard.

## Table of Contents

1. [Testing Framework](#testing-framework)
2. [Debugging Tools](#debugging-tools)
3. [Common Issues and Solutions](#common-issues-and-solutions)
4. [Performance Testing](#performance-testing)
5. [Security Testing](#security-testing)

## Testing Framework

### Cloudflare Worker Backend Testing

The backend uses Jest for testing. Tests are located in the `cloudflare-worker/test` directory.

#### Running Backend Tests

```bash
cd cloudflare-worker
npm install
npm test
```

#### Key Test Files

- `index.test.js`: Tests the main API endpoints
- `auth.test.js`: Tests authentication functionality
- `families.test.js`: Tests family management endpoints
- `devices.test.js`: Tests device management endpoints

#### Mocking Strategy

The tests use Jest's mocking capabilities to mock:
- KV storage operations
- JWT verification
- External API calls

### Mobile App Testing

The React Native app uses Jest and React Native Testing Library for testing. Tests are located in the `mobile-app/src/tests` directory.

#### Running Mobile App Tests

```bash
cd mobile-app
npm install
npm test
```

#### Key Test Files

- `App.test.tsx`: Tests the main application component
- `AuthContext.test.tsx`: Tests authentication context
- `useMonitoring.test.js`: Tests the monitoring hook

#### Mocking Strategy

The tests mock:
- Native modules
- Firebase services
- React Navigation

### Web Dashboard Testing

The React web dashboard uses Jest and React Testing Library for testing. Tests are located in the `web-dashboard/src/tests` directory.

#### Running Web Dashboard Tests

```bash
cd web-dashboard
npm install
npm test
```

#### Key Test Files

- `App.test.tsx`: Tests the main application component
- `AuthContext.test.tsx`: Tests authentication context
- `Dashboard.test.tsx`: Tests the dashboard component

## Debugging Tools

### Cloudflare Worker Debugging

The Cloudflare Worker includes a comprehensive debug module (`src/debug.js`) that provides:

1. **Request Logging**: Logs all incoming requests with details
   ```javascript
   import { requestLogger } from './debug';
   
   // Use in your worker
   addEventListener('fetch', event => {
     const handler = requestLogger()(request => handleRequest(request));
     event.respondWith(handler(event.request));
   });
   ```

2. **Performance Monitoring**: Tracks execution time of operations
   ```javascript
   import { performanceMonitor } from './debug';
   
   // Use in your worker
   addEventListener('fetch', event => {
     const handler = performanceMonitor()(request => handleRequest(request));
     event.respondWith(handler(event.request));
   });
   ```

3. **KV Operation Logging**: Wraps KV operations with logging
   ```javascript
   import { createKVLogger, enableDebugMode } from './debug';
   
   // Use in your worker
   addEventListener('fetch', event => {
     const debugEnv = enableDebugMode(env);
     event.respondWith(handleRequest(event.request, debugEnv));
   });
   ```

### Mobile App Debugging

The React Native app includes a debug utility (`src/utils/debug.ts`) that provides:

1. **Structured Logging**: Log messages with levels and context
   ```typescript
   import { debug } from '../utils/debug';
   
   // Use in your components
   debug.info('User logged in', { userId: '123' });
   debug.error('Failed to fetch data', error);
   ```

2. **Component Context**: Track which component is generating logs
   ```typescript
   import { debug } from '../utils/debug';
   
   function MyComponent() {
     debug.setCurrentScreen('MyComponent');
     // ...
   }
   ```

3. **Log Export**: Export logs for troubleshooting
   ```typescript
   import { debug } from '../utils/debug';
   
   function exportLogs() {
     const logText = debug.exportLogs();
     // Share or save logs
   }
   ```

### Web Dashboard Debugging

The React web dashboard includes a debug utility (`src/utils/debug.ts`) that provides:

1. **Structured Logging**: Log messages with levels and context
   ```typescript
   import { debug } from '../utils/debug';
   
   // Use in your components
   debug.info('User logged in', { userId: '123' });
   debug.error('Failed to fetch data', error);
   ```

2. **Performance Monitoring**: Track component render and operation times
   ```typescript
   import { debug } from '../utils/debug';
   
   function MyComponent() {
     const perfMonitor = debug.createPerformanceMonitor('MyComponent');
     
     const fetchData = async () => {
       const perf = perfMonitor.start('fetchData');
       // Fetch data...
       perf.end(); // Logs the duration
     };
     
     // ...
   }
   ```

3. **Browser Information**: Collect environment details for troubleshooting
   ```typescript
   import { debug } from '../utils/debug';
   
   function reportIssue() {
     const browserInfo = debug.getBrowserInfo();
     const logs = debug.getLogs();
     // Submit issue with context
   }
   ```

## Common Issues and Solutions

### Cloudflare Worker Issues

1. **KV Access Errors**
   - **Symptom**: "Error: Worker attempted to access a namespace that it doesn't have access to"
   - **Solution**: Ensure the KV namespace ID in `wrangler.toml` is correct and the namespace exists

2. **JWT Verification Failures**
   - **Symptom**: "Error: Invalid token" or "Error: Token expired"
   - **Solution**: Check that the JWT_SECRET environment variable is set correctly and matches between client and server

3. **CORS Issues**
   - **Symptom**: "Access to fetch at 'X' from origin 'Y' has been blocked by CORS policy"
   - **Solution**: Ensure the worker includes proper CORS headers for your domains

### Mobile App Issues

1. **Native Module Linking Errors**
   - **Symptom**: "Native module X is not available for platform Y"
   - **Solution**: Run `npx react-native link` or check the native module installation

2. **Firebase Configuration Issues**
   - **Symptom**: "Firebase app not initialized" or "Firebase configuration not found"
   - **Solution**: Ensure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is properly configured

3. **Background Service Not Running**
   - **Symptom**: Monitoring stops when app is in background
   - **Solution**: Check battery optimization settings and ensure foreground service is properly configured

### Web Dashboard Issues

1. **API Connection Issues**
   - **Symptom**: "Failed to fetch" or "Network error"
   - **Solution**: Check that the API URL in `.env` is correct and the Cloudflare Worker is running

2. **Authentication Token Expiration**
   - **Symptom**: Sudden logout or "Unauthorized" errors
   - **Solution**: Implement token refresh logic or extend token expiration time

3. **React Query Cache Issues**
   - **Symptom**: Stale data displayed or inconsistent UI state
   - **Solution**: Properly configure query invalidation and refetching strategies

## Performance Testing

### Cloudflare Worker Performance

1. **Response Time Testing**
   ```bash
   wrk -t12 -c400 -d30s https://your-worker.workers.dev/api/endpoint
   ```

2. **Monitoring KV Operation Times**
   - Use the KV logger from the debug module to track operation times
   - Look for operations taking > 100ms as potential bottlenecks

### Mobile App Performance

1. **React Native Performance Monitor**
   - Enable the performance monitor in development builds
   - Look for components with render times > 16ms (60fps threshold)

2. **Battery Usage Monitoring**
   - Test background service battery impact over 24 hours
   - Target < 5% battery usage per day

### Web Dashboard Performance

1. **Lighthouse Testing**
   ```bash
   npx lighthouse https://your-dashboard-url.com
   ```

2. **React Profiler**
   - Use React DevTools Profiler to identify slow components
   - Look for unnecessary re-renders and optimize with memoization

## Security Testing

### Cloudflare Worker Security

1. **JWT Implementation Testing**
   - Verify token expiration handling
   - Test against token tampering
   - Check for proper signature verification

2. **KV Access Control Testing**
   - Verify users can only access their own data
   - Test family member permission boundaries
   - Ensure child accounts have appropriate restrictions

### Mobile App Security

1. **Secure Storage Testing**
   - Verify sensitive data is stored securely
   - Test credential handling
   - Check for proper encryption of local data

2. **Permission Handling**
   - Test permission request flows
   - Verify graceful degradation when permissions are denied

### Web Dashboard Security

1. **XSS Protection Testing**
   - Test input sanitization
   - Verify Content Security Policy effectiveness
   - Check for proper output encoding

2. **CSRF Protection**
   - Verify CSRF token implementation
   - Test cross-origin request handling
