import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows } from '../constants/theme';
import type { IconComponent } from '../types/ui';

type QuickActionProps = {
  body: string;
  icon: IconComponent;
  onPress: () => void;
  title: string;
  tone?: 'green' | 'blue' | 'violet' | 'amber';
};

const tones = {
  green: { bg: colors.rowActive, border: colors.borderStrong, fg: colors.green },
  blue: { bg: colors.infoSoft, border: 'rgba(77, 171, 247, 0.25)', fg: colors.info },
  violet: { bg: colors.violetSoft, border: 'rgba(167, 139, 250, 0.25)', fg: colors.violet },
  amber: { bg: colors.warningSoft, border: 'rgba(255, 184, 77, 0.25)', fg: colors.warning },
};

export function QuickAction({
  body,
  icon: Icon,
  onPress,
  title,
  tone = 'green',
}: QuickActionProps) {
  const palette = tones[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        shadows.depth,
        pressed ? styles.pressed : null,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: palette.bg, borderColor: palette.border },
        ]}
      >
        <Icon color={palette.fg} size={22} strokeWidth={2.4} />
      </View>
      <View className="flex-1 gap-1">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.row,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 18,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
