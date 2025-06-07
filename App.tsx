import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';
import { Calendar } from 'react-native-calendars';
import CaptureScreen from './src/screens/CaptureScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CaptureScreen" component={CaptureScreen} options={{ headerShown: false }} />
        {/* Add other screens here as needed */}
     
      </Stack.Navigator>
    </NavigationContainer>
  );
}
