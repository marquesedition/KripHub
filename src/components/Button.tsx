import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, shadows } from '../constants/theme';
import type { IconComponent } from '../types/ui';

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: IconComponent;
};

export function Button({
  children,
  disabled,
  loading,
  onPress,
  style,
  variant = 'primary',
  icon: Icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isSolid = variant === 'primary' || variant === 'danger';
  const palette = styles[variant];

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        palette,
        variant === 'primary' ? shadows.glow : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={isSolid ? colors.background : colors.text} /> : null}
      {!loading && Icon ? (
        <Icon
          color={isSolid ? colors.background : colors.text}
          size={18}
          strokeWidth={2.4}
        />
      ) : null}
      <Text style={[styles.label, isSolid ? styles.solidLabel : styles.ghostLabel]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  secondary: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  solidLabel: {
    color: colors.bg,
  },
  ghostLabel: {
    color: colors.text,
  },
});
