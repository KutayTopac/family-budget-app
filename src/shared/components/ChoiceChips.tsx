import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/shared/theme/colors';

export type Choice<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

export function ChoiceChips<T extends string>({ choices, value, onChange }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={choice.value}
            onPress={() => onChange(choice.value)}
            style={[styles.chip, selected && styles.selectedChip]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 9, paddingVertical: 2 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 15, paddingVertical: 10 },
  selectedChip: { borderColor: colors.accent, backgroundColor: colors.accent },
  label: { color: colors.text, fontWeight: '700' },
  selectedLabel: { color: colors.surface },
});
