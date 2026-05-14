import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-hub-bg">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
