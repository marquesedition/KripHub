import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: colors.accentSoft, color: colors.green },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  neutral: { backgroundColor: colors.surfaceStrong, color: colors.muted },
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const style = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.label, { color: style.color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
});
