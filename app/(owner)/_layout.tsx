import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors, fonts } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';

export default function OwnerLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-hub-bg">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.mono, fontWeight: '800' },
      }}
    />
  );
}
