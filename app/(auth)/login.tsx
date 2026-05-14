import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { colors, fonts, radii, spacing } from '../../src/constants/theme';
import {
  isSupabaseConfigured,
  supabaseConfigMessage,
} from '../../src/lib/supabase';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { signInWithNickname } from '../../src/services/auth';

export default function LoginScreen() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);

  async function onSubmit() {
    setAuthError(null);
    setLoading(true);

    try {
      await signInWithNickname(nickname, password);
      router.replace('/gallery');
    } catch (error) {
      const message = await getApiErrorMessage(error);
      setAuthError({ title: 'No se pudo iniciar sesión', message });
      Alert.alert('No se pudo iniciar sesión', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <ShieldCheck color={colors.green} size={24} strokeWidth={2.4} />
          </View>
          <Text style={styles.kicker}>KRIPHUB</Text>
          <Text style={styles.title}>Autenticación de galería privada</Text>
          <Text style={styles.subtitle}>
            Entra para acceder a colecciones cifradas y códigos privados.
          </Text>
        </View>

        <Surface className="gap-0" style={styles.card}>
          <View style={styles.inputStack}>
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              onChangeText={(value) => {
                setNickname(value);
                if (authError) setAuthError(null);
              }}
              placeholder="nickname"
              placeholderTextColor={colors.faint}
              selectionColor={colors.green}
              style={styles.input}
              value={nickname}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={(value) => {
                setPassword(value);
                if (authError) setAuthError(null);
              }}
              placeholder="contraseña"
              placeholderTextColor={colors.faint}
              secureTextEntry
              selectionColor={colors.green}
              style={styles.input}
              value={password}
            />
          </View>

          {!isSupabaseConfigured ? (
            <View style={styles.apiErrorBox}>
              <Text style={styles.apiErrorLabel}>SUPABASE SIN CONFIGURAR</Text>
              <Text style={styles.apiErrorText}>{supabaseConfigMessage}</Text>
            </View>
          ) : null}

          {authError ? (
            <View style={styles.apiErrorBox}>
              <Text style={styles.apiErrorLabel}>{authError.title}</Text>
              <Text style={styles.apiErrorText}>{authError.message}</Text>
            </View>
          ) : null}

          <View style={styles.actionStack}>
            <Button
              disabled={!isSupabaseConfigured || !nickname || !password}
              loading={loading}
              onPress={onSubmit}
              style={styles.primaryButton}
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </Button>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/register')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Crear cuenta segura</Text>
            </Pressable>
          </View>
        </Surface>

        <Text style={styles.footerText}>PROTOCOLO DE GALERÍA CIFRADA ACTIVO</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 640,
    width: '100%',
  },
  header: {
    marginBottom: spacing.md,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.rowActive,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
  kicker: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  card: {
    padding: spacing.md,
  },
  inputStack: {
    gap: 12,
  },
  actionStack: {
    gap: 12,
    marginTop: spacing.lg,
  },
  apiErrorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.55)',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  apiErrorLabel: {
    color: '#ff8f8f',
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
  },
  apiErrorText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: colors.blue,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
  },
  footerText: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
