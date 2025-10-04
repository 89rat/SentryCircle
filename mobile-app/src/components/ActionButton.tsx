import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Note: In a real implementation, you would use a proper icon library like react-native-vector-icons
// For this example, we'll just use a placeholder for the icon

interface ActionButtonProps {
  title: string;
  icon: string; // This would be the icon name in a real implementation
  onPress: () => void;
  backgroundColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  icon,
  onPress,
  backgroundColor,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: backgroundColor || theme.colors.primary },
        style,
      ]}
      onPress={onPress}
    >
      {/* This would be replaced with an actual icon component */}
      <Text style={styles.iconPlaceholder}>{icon[0].toUpperCase()}</Text>
      <Text style={[styles.title, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 40,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ActionButton;
