import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/lib/supabaseClient';
import { ThemeProvider } from './src/lib/ThemeContext';
import { SettingsProvider } from './src/lib/SettingsContext';
import AppLoader from './src/components/common/AppLoader';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { initNotifications, addNotificationResponseListener } from './src/lib/pushNotifications';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }, []);

  // ── Push notifications init ────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    initNotifications().catch(console.warn);
    // Handle taps on notifications when app is backgrounded/closed
    const unsub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Future: navigate to the relevant screen based on data.type
      console.log('[Notification tapped]', data?.type);
    });
    return unsub;
  }, []);

  if (session === undefined) return <AppLoader />;

  const content = (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );

  if (Platform.OS !== 'web') return content;

  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>{content}</View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppNavigator />
      </SettingsProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
  },
  webInner: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});
