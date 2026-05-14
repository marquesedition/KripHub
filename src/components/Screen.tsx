import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = (
    <View className="mx-auto w-full max-w-[820px] flex-1 gap-5 px-5 py-6">
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bg, '#101319', colors.bg]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.vignette} />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          className="flex-1"
        >
          {scroll ? (
            <ScrollView
              contentContainerClassName="grow"
              keyboardShouldPersistTaps="handled"
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(60, 255, 107, 0.05)',
    borderWidth: 1,
  },
});
