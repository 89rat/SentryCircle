import { useState, useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// In a real implementation, this would be linked to the native module
// For this example, we'll mock the native module
const MockMonitoringModule = {
  startMonitoring: () => Promise.resolve(true),
  stopMonitoring: () => Promise.resolve(true),
  isMonitoring: () => Promise.resolve(false),
  getBatteryLevel: () => Promise.resolve(85),
  getLastLocation: () => Promise.resolve('123.456, 789.012'),
};

// Use the actual native module if available, otherwise use the mock
const MonitoringModule = NativeModules.MonitoringModule || MockMonitoringModule;

// Create an event emitter for the native module
const monitoringEventEmitter = MonitoringModule.addListener
  ? new NativeEventEmitter(MonitoringModule)
  : null;

export const useMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [error, setError] = useState(null);

  // Check initial monitoring status
  useEffect(() => {
    const checkMonitoringStatus = async () => {
      try {
        const status = await MonitoringModule.isMonitoring();
        setIsMonitoring(status);
        
        // Get initial battery level
        const battery = await MonitoringModule.getBatteryLevel();
        setBatteryLevel(battery);
        
        // Get initial location
        const location = await MonitoringModule.getLastLocation();
        setLastLocation(location);
      } catch (err) {
        console.error('Error checking monitoring status:', err);
        setError('Failed to check monitoring status');
      }
    };

    checkMonitoringStatus();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!monitoringEventEmitter) return;

    // Listen for location updates
    const locationSubscription = monitoringEventEmitter.addListener(
      'onLocationUpdate',
      (event) => {
        setLastLocation(event.location);
      }
    );

    // Listen for battery updates
    const batterySubscription = monitoringEventEmitter.addListener(
      'onBatteryUpdate',
      (event) => {
        setBatteryLevel(event.level);
      }
    );

    // Listen for monitoring status changes
    const statusSubscription = monitoringEventEmitter.addListener(
      'onMonitoringStatusChange',
      (event) => {
        setIsMonitoring(event.isActive);
      }
    );

    // Clean up subscriptions
    return () => {
      locationSubscription.remove();
      batterySubscription.remove();
      statusSubscription.remove();
    };
  }, []);

  // Start monitoring function
  const startMonitoring = async () => {
    try {
      await MonitoringModule.startMonitoring();
      setIsMonitoring(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error starting monitoring:', err);
      setError('Failed to start monitoring');
      return false;
    }
  };

  // Stop monitoring function
  const stopMonitoring = async () => {
    try {
      await MonitoringModule.stopMonitoring();
      setIsMonitoring(false);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error stopping monitoring:', err);
      setError('Failed to stop monitoring');
      return false;
    }
  };

  return {
    isMonitoring,
    lastLocation,
    batteryLevel,
    error,
    startMonitoring,
    stopMonitoring,
  };
};
