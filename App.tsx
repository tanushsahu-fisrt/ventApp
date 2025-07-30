import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboardscreen from './src/screens/dashboard-screen';
import Listener from './src/screens/listener';
import SessionEnd from './src/screens/session-end';
import Vent from './src/screens/vent';
import VentSubmitted from './src/screens/vent-submitted';
import VoiceCall from './src/screens/voice-call';
import WelcomeScreen from './src/screens/index';
import { AuthProvider } from './context/AuthContext';

const Stack = createNativeStackNavigator();


const StacknNavigator =  () => {
  return (
    <Stack.Navigator initialRouteName="WelcomeScreen">
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="Dashboard" component={Dashboardscreen} />
      <Stack.Screen name="Listener" component={Listener} />
      <Stack.Screen name="SessionEnd" component={SessionEnd} />
      <Stack.Screen name="Vent" component={Vent} />
      <Stack.Screen name="VentSubmitted" component={VentSubmitted} />
      <Stack.Screen 
        name="VoiceCall" 
        component={VoiceCall} 
        options={{ 
        headerShown: false,
        gestureEnabled: false, // Prevent swipe back
        animationEnabled: false
        }}
     />
    </Stack.Navigator>
  );
}

const App = () =>  {
  
  return (
    <AuthProvider>
      <NavigationContainer>
        <StacknNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

export default App;
