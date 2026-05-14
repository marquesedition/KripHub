import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.row,
    borderColor: colors.border,
    borderLeftColor: colors.green,
    borderLeftWidth: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
