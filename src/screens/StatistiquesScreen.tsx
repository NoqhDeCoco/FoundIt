import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useFindsRealtime } from '@/hooks/useFindsRealtime';
import { listCategories } from '@/services/categories';
import type { Category } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Colors } from '@/constants/theme';

type GroupBy = 'category' | 'currency' | 'type';

const PALETTE = [
  '#208AEF', '#F4A261', '#2A9D8F', '#E76F51', '#8338EC',
  '#06D6A0', '#FFB703', '#FB5607', '#3A86FF', '#FF006E',
];

function buildPieData(
  finds: ReturnType<typeof useFindsRealtime>['finds'],
  groupBy: GroupBy,
  categoriesMap: Record<string, Category>
) {
  const totals: Record<string, number> = {};

  for (const f of finds) {
    let key: string;
    if (groupBy === 'category') key = categoriesMap[f.categoryId]?.name ?? 'Sans catégorie';
    else if (groupBy === 'currency') key = f.currency;
    else key = f.type === 'piece' ? 'Pièces' : 'Billets';
    totals[key] = (totals[key] ?? 0) + f.qty;
  }

  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  return Object.entries(totals).map(([label, value], i) => ({
    value,
    color: PALETTE[i % PALETTE.length],
    label,
    pct: Math.round((value / total) * 100),
  }));
}

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'category', label: 'Catégorie' },
  { key: 'currency', label: 'Devise' },
  { key: 'type', label: 'Type' },
];

export default function StatistiquesScreen() {
  const { user } = useAuth();
  const { finds, loading } = useFindsRealtime();
  const theme = useTheme();
  const isDark = theme === Colors.dark;

  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});

  useEffect(() => {
    if (!user) return;
    listCategories(user.uid).then((cats) => {
      const map: Record<string, Category> = {};
      cats.forEach((c) => { map[c.id] = c; });
      setCategoriesMap(map);
    });
  }, [user]);

  const pieData = useMemo(
    () => buildPieData(finds, groupBy, categoriesMap),
    [finds, groupBy, categoriesMap]
  );

  const totalQty = finds.reduce((s, f) => s + f.qty, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>Statistiques</ThemedText>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 24 }]}>

          {/* Sélecteur "Regrouper par" */}
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Regrouper par
          </ThemedText>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {GROUP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.toggleOption, groupBy === opt.key && { backgroundColor: theme.backgroundSelected }]}
                onPress={() => setGroupBy(opt.key)}
              >
                <ThemedText type="small">{opt.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Camembert */}
          {loading ? null : pieData.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary">
                Aucune trouvaille pour l'instant
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.chartWrapper}>
                <PieChart
                  data={pieData}
                  donut
                  radius={110}
                  innerRadius={64}
                  centerLabelComponent={() => (
                    <View style={styles.centerLabel}>
                      <ThemedText type="subtitle">{totalQty}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">pièces</ThemedText>
                    </View>
                  )}
                  strokeWidth={2}
                  strokeColor={theme.background}
                />
              </View>

              {/* Légende */}
              <View style={styles.legend}>
                {pieData.map((item) => (
                  <View key={item.label} style={[styles.legendRow, { backgroundColor: theme.backgroundElement }]}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <ThemedText type="default" style={styles.legendLabel}>{item.label}</ThemedText>
                    <View style={styles.legendRight}>
                      <ThemedText type="smallBold">{item.pct}%</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 6 }}>
                        {item.value} pcs
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  content: { paddingHorizontal: 16 },
  sectionLabel: { marginBottom: 8 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  toggleOption: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  chartWrapper: { alignItems: 'center', marginVertical: 28 },
  centerLabel: { alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  legend: { gap: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1 },
  legendRight: { flexDirection: 'row', alignItems: 'center' },
});
