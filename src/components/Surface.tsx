import { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, shadows } from '../constants/theme';
import { cn } from '../utils/cn';

type SurfaceProps = {
  children: ReactNode;
  muted?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Surface({ children, className, muted, style }: SurfaceProps) {
  return (
    <BlurView
      intensity={26}
      tint="dark"
      className={cn(
        'overflow-hidden rounded-xl border border-hub-border p-5',
        muted ? 'bg-hub-panel/90' : 'bg-hub-surface/90',
        className,
      )}
      style={[styles.surface, muted ? styles.muted : styles.strong, shadows.depth, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.panel,
  },
  strong: {
    backgroundColor: colors.surface,
  },
});
