import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Import components
import StatusCard from '../components/StatusCard';
import ActionButton from '../components/ActionButton';

// Import hooks
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMonitoring } from '../hooks/useMonitoring';

// Define the navigation prop type
type RootStackParamList = {
  Home: undefined;
  CheckIn: undefined;
  Permissions: undefined;
  Settings: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isMonitoring, startMonitoring, stopMonitoring, lastLocation, batteryLevel } = useMonitoring();
  
  const [safetyScore, setSafetyScore] = useState<number>(85);
  const [lastCheckIn, setLastCheckIn] = useState<string>('2 hours ago');
  const [achievements, setAchievements] = useState<string[]>([
    'Consistent Check-ins',
    'Location Sharing',
    'Digital Citizenship'
  ]);

  useEffect(() => {
    // Fetch user data, safety score, and achievements
    // This would typically involve API calls
    const fetchUserData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        setSafetyScore(85);
        setLastCheckIn('2 hours ago');
        setAchievements([
          'Consistent Check-ins',
          'Location Sharing',
          'Digital Citizenship'
        ]);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    fetchUserData();
  }, []);

  const handleCheckIn = () => {
    navigation.navigate('CheckIn');
  };

  const handlePermissions = () => {
    navigation.navigate('Permissions');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await stopMonitoring();
        Alert.alert('Monitoring Stopped', 'Your location is no longer being shared.');
      } else {
        await startMonitoring();
        Alert.alert('Monitoring Started', 'Your location is now being shared with your guardian.');
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      Alert.alert('Error', 'Failed to toggle monitoring');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.colors.text }]}>
            Hello, {user?.name || 'User'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Your digital safety dashboard
          </Text>
        </View>

        <StatusCard
          title="Safety Score"
          value={`${safetyScore}%`}
          status={safetyScore > 80 ? 'good' : safetyScore > 60 ? 'warning' : 'danger'}
          description="Based on your digital activity and check-ins"
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Monitoring Status</Text>
          <View style={styles.monitoringContainer}>
            <View style={styles.monitoringInfo}>
              <Text style={[styles.monitoringText, { color: theme.colors.text }]}>
                {isMonitoring ? 'Active' : 'Inactive'}
              </Text>
              <Text style={[styles.monitoringSubtext, { color: theme.colors.text }]}>
                Last check-in: {lastCheckIn}
              </Text>
              {lastLocation && (
                <Text style={[styles.monitoringSubtext, { color: theme.colors.text }]}>
                  Location: {lastLocation}
                </Text>
              )}
              <Text style={[styles.monitoringSubtext, { color: theme.colors.text }]}>
                Battery: {batteryLevel}%
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: isMonitoring ? theme.colors.error : theme.colors.success }
              ]}
              onPress={toggleMonitoring}
            >
              <Text style={styles.toggleButtonText}>
                {isMonitoring ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements</Text>
          <View style={styles.achievementsContainer}>
            {achievements.map((achievement, index) => (
              <View key={index} style={[styles.achievementItem, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.achievementText, { color: theme.colors.text }]}>
                  {achievement}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <ActionButton
            title="Check In"
            icon="check-circle"
            onPress={handleCheckIn}
            backgroundColor={theme.colors.primary}
          />
          <ActionButton
            title="Permissions"
            icon="shield"
            onPress={handlePermissions}
            backgroundColor={theme.colors.secondary}
          />
          <ActionButton
            title="Settings"
            icon="settings"
            onPress={handleSettings}
            backgroundColor={theme.colors.border}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  monitoringContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  monitoringInfo: {
    flex: 1,
  },
  monitoringText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monitoringSubtext: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  achievementsContainer: {
    marginTop: 8,
  },
  achievementItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
});

export default HomeScreen;
