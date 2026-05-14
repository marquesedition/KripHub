import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth() {
  const auth = useAuth();

  if (auth.loading) {
    return {
      ...auth,
      gate: (
        <View className="flex-1 items-center justify-center bg-hub-bg">
          <ActivityIndicator color={colors.accent} />
        </View>
      ),
    };
  }

  if (!auth.session) {
    return { ...auth, gate: <Redirect href="/login" /> };
  }

  return { ...auth, gate: null };
}
