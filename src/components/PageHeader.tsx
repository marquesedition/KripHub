import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows } from '../constants/theme';
import type { IconComponent } from '../types/ui';

type PageHeaderProps = {
  eyebrow?: string;
  icon?: IconComponent;
  meta?: string;
  title: string;
};

export function PageHeader({ eyebrow, icon: Icon, meta, title }: PageHeaderProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        {Icon ? (
          <View style={[styles.mark, shadows.glow]}>
            <Icon color={colors.green} size={22} strokeWidth={2.4} />
          </View>
        ) : null}
        <View className="flex-1">
          {eyebrow ? (
            <Text style={styles.eyebrow}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    backgroundColor: colors.rowActive,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  eyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
