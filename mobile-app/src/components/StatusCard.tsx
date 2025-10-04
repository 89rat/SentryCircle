import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface StatusCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'danger';
  description?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, status, description }) => {
  const { theme } = useTheme();
  
  // Determine the status color
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>
      <Text style={[styles.value, { color: getStatusColor() }]}>{value}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.text }]}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default StatusCard;
