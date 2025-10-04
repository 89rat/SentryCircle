import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  success: string;
  warning: string;
  error: string;
}

// Define theme type
interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

// Define context type
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

// Define light theme
const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    background: '#ffffff',
    card: '#f8f9fa',
    text: '#212529',
    border: '#dee2e6',
    notification: '#f8d7da',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
  },
};

// Define dark theme
const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    background: '#121212',
    card: '#1e1e1e',
    text: '#f8f9fa',
    border: '#343a40',
    notification: '#721c24',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
  },
};

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

// Create a provider component
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the device color scheme
  const colorScheme = useColorScheme();
  
  // Initialize theme state based on device color scheme
  const [isDark, setIsDark] = useState<boolean>(colorScheme === 'dark');
  
  // Update theme when device color scheme changes
  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setIsDark(prevIsDark => !prevIsDark);
  };
  
  // Get the current theme
  const theme = isDark ? darkTheme : lightTheme;
  
  // Create the context value object
  const contextValue: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
  };
  
  // Return the provider with the context value
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook for using the theme context
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
