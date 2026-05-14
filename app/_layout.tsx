import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext';
import { colors, fonts } from '../src/constants/theme';
import { useAuth } from '../src/contexts/AuthContext';

function RootNavigator() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-hub-bg">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.mono, fontWeight: '800' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
