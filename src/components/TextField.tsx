import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.row,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
});
