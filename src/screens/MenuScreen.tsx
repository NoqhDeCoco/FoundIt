import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useFindsRealtime } from '@/hooks/useFindsRealtime';
import { listCategories } from '@/services/categories';
import type { Category, Find } from '@/types';
import { formatAmount, formatDate } from '@/utils/formatFind';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset } from '@/constants/theme';
import AddFindModal from '@/screens/AddFindModal';
import EditFindModal from '@/screens/EditFindModal';

export default function MenuScreen() {
  const { user } = useAuth();
  const { finds, loading } = useFindsRealtime();
  const theme = useTheme();

  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [addVisible, setAddVisible] = useState(false);
  const [selectedFind, setSelectedFind] = useState<Find | null>(null);

  const refreshCategories = () => {
    if (!user) return;
    listCategories(user.uid).then((cats) => {
      const map: Record<string, Category> = {};
      cats.forEach((c) => { map[c.id] = c; });
      setCategoriesMap(map);
    });
  };

  useEffect(() => { refreshCategories(); }, [user]);

  const renderFind = ({ item }: { item: Find }) => {
    const categoryName = categoriesMap[item.categoryId]?.name ?? '—';
    const dateLabel = formatDate(item.date);
    const amountLabel = formatAmount(item.amount, item.qty, item.currency);

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.backgroundElement }]}
        onPress={() => setSelectedFind(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <ThemedText type="smallBold">{dateLabel}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{categoryName}</ThemedText>
        </View>
        <ThemedText type="smallBold">{amountLabel}</ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>Trouvailles</ThemedText>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={theme.text} />
        ) : (
          <FlatList
            data={finds}
            keyExtractor={(item) => item.id}
            renderItem={renderFind}
            contentContainerStyle={[
              styles.list,
              finds.length === 0 && styles.listEmpty,
              { paddingBottom: BottomTabInset + 80, flexGrow: 1 },
            ]}
            ListEmptyComponent={
              <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
                Aucune trouvaille pour l'instant
              </ThemedText>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { bottom: BottomTabInset + 16 }]}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.85}
        >
          <ThemedText type="default" style={styles.fabIcon}>+</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>

      <AddFindModal
        visible={addVisible}
        onClose={() => { setAddVisible(false); refreshCategories(); }}
      />

      <EditFindModal
        find={selectedFind}
        initialCategoryName={selectedFind ? (categoriesMap[selectedFind.categoryId]?.name ?? '') : ''}
        onClose={() => { setSelectedFind(null); refreshCategories(); }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  listEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rowLeft: { gap: 2 },
  separator: { height: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
