import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const CheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleSendCheckIn = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful check-in
      Alert.alert(
        'Check-In Sent',
        'Your guardian has been notified of your check-in.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending check-in:', error);
      Alert.alert('Error', 'Failed to send check-in');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Check In</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          Let your guardian know you're safe
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Message</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Enter your check-in message..."
          placeholderTextColor={theme.isDark ? '#888' : '#999'}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: theme.colors.card }]}
            onPress={() => setMessage("I'm at school and everything is fine.")}
          >
            <Text style={[styles.optionText, { color: theme.colors.text }]}>
              I'm at school
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, { backgroundColor: theme.colors.card }]}
            onPress={() => setMessage("I'm at home now. All good!")}
          >
            <Text style={[styles.optionText, { color: theme.colors.text }]}>
              I'm at home
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, { backgroundColor: theme.colors.card }]}
            onPress={() => setMessage("I'm with friends. Will be home by 6pm.")}
          >
            <Text style={[styles.optionText, { color: theme.colors.text }]}>
              With friends
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.colors.primary },
            isLoading && styles.disabledButton,
          ]}
          onPress={handleSendCheckIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send Check-In</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.primary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 24,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});

export default CheckInScreen;
