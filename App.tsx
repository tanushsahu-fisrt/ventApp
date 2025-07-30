import 'react-native-gesture-handler';
import React from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './context/AuthContext';
import WelcomeScreen from './src/screens';
import DashboardScreen from './src/screens/dashboard-screen';
import VentSubmittedScreen from './src/screens/vent-submitted';
import ListenerScreen from './src/screens/listener';
import VoiceCall from './src/screens/voice-call';
import SessionEndedScreen from './src/screens/session-end';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RNStatusBar
          barStyle="light-content"
          translucent={Platform.OS === 'android'}
        />

        <NavigationContainer>
          <Stack.Navigator
            initialRouteName='Welcome'
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1a1a40' },
              
              gestureEnabled: true,
            }}
          >
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="DashboardScreen"
              component={DashboardScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="VentSubmittedScreen"
              component={VentSubmittedScreen}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="ListenerScreen"
              component={ListenerScreen}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="VoiceCall"
              component={VoiceCall}
              options={{
                gestureEnabled: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="SessionEndedScreen"
              component={SessionEndedScreen}
              options={{ gestureEnabled: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
