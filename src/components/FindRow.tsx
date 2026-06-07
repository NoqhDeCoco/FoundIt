import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, formatDate } from '@/utils/formatFind';
import type { Find } from '@/types';

type Props = {
  find: Find;
  categoryName: string;
  onPress: (find: Find) => void;
};

export default function FindRow({ find, categoryName, onPress }: Props) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}
      onPress={() => onPress(find)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <ThemedText type="smallBold">{formatDate(find.date)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{categoryName}</ThemedText>
      </View>
      <ThemedText type="smallBold">{formatAmount(find.amount, find.qty, find.currency)}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  left: { gap: 2 },
});
