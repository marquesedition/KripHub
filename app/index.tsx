import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from '../src/constants/theme';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-hub-bg px-8">
        <View className="h-16 w-16 items-center justify-center rounded-lg border border-hub-accent bg-hub-muted">
          <Text className="text-2xl font-extrabold text-hub-accent">KH</Text>
        </View>
        <ActivityIndicator color={colors.accent} />
        <Text className="text-center text-sm text-hub-soft">Preparando tu galería privada</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/gallery" />;
}
