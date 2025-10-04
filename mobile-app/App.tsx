import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Define the stack navigator types
type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CheckIn: undefined;
  Permissions: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has completed onboarding
    // This would typically involve checking AsyncStorage or a secure storage solution
    const checkAuthState = async () => {
      try {
        // Simulate authentication check
        setTimeout(() => {
          setIsAuthenticated(false);
          setHasCompletedOnboarding(false);
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Error checking authentication state:', error);
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading SentryCircle...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!isAuthenticated ? (
                // Auth screens
                <>
                  {!hasCompletedOnboarding && (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                  )}
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                </>
              ) : (
                // App screens
                <>
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="CheckIn" component={CheckInScreen} />
                  <Stack.Screen name="Permissions" component={PermissionsScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </AuthProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
});

export default App;
