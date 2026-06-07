import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FindRow from '@/components/FindRow';
import { useAuth } from '@/context/AuthContext';
import { useFindsRealtime } from '@/hooks/useFindsRealtime';
import { listCategories } from '@/services/categories';
import { CURRENCIES, type Category, type Find, type FindType } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupBy = 'category' | 'currency' | 'type';

type Filters = {
  year: number | null;
  month: number | null;
  day: number | null;
  excludedCategoryIds: Set<string>;
  excludedTypes: Set<string>;
  excludedCurrencies: Set<string>;
  minQty: string;
  categorySearch: string;
};

const DEFAULT_FILTERS: Filters = {
  year: null, month: null, day: null,
  excludedCategoryIds: new Set(),
  excludedTypes: new Set(),
  excludedCurrencies: new Set(),
  minQty: '',
  categorySearch: '',
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const PALETTE = [
  '#208AEF', '#F4A261', '#2A9D8F', '#E76F51', '#8338EC',
  '#06D6A0', '#FFB703', '#FB5607', '#3A86FF', '#FF006E',
];

const MONTHS_FR = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'category', label: 'Catégorie' },
  { key: 'currency', label: 'Devise' },
  { key: 'type', label: 'Type' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActiveFilters(f: Filters) {
  let n = 0;
  if (f.year !== null) n++;
  if (f.month !== null) n++;
  if (f.day !== null) n++;
  if (f.excludedCategoryIds.size > 0) n++;
  if (f.excludedTypes.size > 0) n++;
  if (f.excludedCurrencies.size > 0) n++;
  if (f.minQty !== '') n++;
  return n;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function StatistiquesScreen() {
  const { user } = useAuth();
  const { finds, loading } = useFindsRealtime();
  const theme = useTheme();

  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (!user) return;
    listCategories(user.uid).then((cats) => {
      const map: Record<string, Category> = {};
      cats.forEach((c) => { map[c.id] = c; });
      setCategoriesMap(map);
    });
  }, [user]);

  // ─── Valeurs disponibles dans les données ──────────────────────────────────

  const availableYears = useMemo(() =>
    [...new Set(finds.map(f => f.date?.toDate().getFullYear()).filter(Boolean) as number[])].sort(),
    [finds]
  );

  const availableMonths = useMemo(() => {
    if (filters.year === null) return [];
    return [...new Set(
      finds
        .filter(f => f.date?.toDate().getFullYear() === filters.year)
        .map(f => f.date?.toDate().getMonth() + 1)
    )].sort((a, b) => a - b);
  }, [finds, filters.year]);

  const availableDays = useMemo(() => {
    if (filters.year === null || filters.month === null) return [];
    return [...new Set(
      finds
        .filter(f => {
          const d = f.date?.toDate();
          return d && d.getFullYear() === filters.year && d.getMonth() + 1 === filters.month;
        })
        .map(f => f.date?.toDate().getDate())
    )].sort((a, b) => a - b);
  }, [finds, filters.year, filters.month]);

  const availableCurrencies = useMemo(() =>
    [...new Set(finds.map(f => f.currency))],
    [finds]
  );

  const categoriesInFinds = useMemo(() => {
    const ids = new Set(finds.map(f => f.categoryId));
    return Object.values(categoriesMap)
      .filter(c => ids.has(c.id))
      .filter(c => filters.categorySearch === '' ||
        c.name.toLowerCase().includes(filters.categorySearch.toLowerCase()));
  }, [finds, categoriesMap, filters.categorySearch]);

  // ─── Filtrage des trouvailles ──────────────────────────────────────────────

  const filteredFinds = useMemo(() => finds.filter(f => {
    const d = f.date?.toDate();
    if (d) {
      if (filters.year !== null && d.getFullYear() !== filters.year) return false;
      if (filters.month !== null && d.getMonth() + 1 !== filters.month) return false;
      if (filters.day !== null && d.getDate() !== filters.day) return false;
    }
    if (filters.excludedCategoryIds.has(f.categoryId)) return false;
    if (filters.excludedTypes.has(f.type)) return false;
    if (filters.excludedCurrencies.has(f.currency)) return false;
    return true;
  }), [finds, filters]);

  // ─── Construction du pie ───────────────────────────────────────────────────

  const pieData = useMemo(() => {
    const minQty = parseInt(filters.minQty, 10) || 0;
    const totals: Record<string, number> = {};

    for (const f of filteredFinds) {
      let key: string;
      if (groupBy === 'category') key = categoriesMap[f.categoryId]?.name ?? 'Sans catégorie';
      else if (groupBy === 'currency') key = f.currency;
      else key = f.type === 'piece' ? 'Pièces' : 'Billets';
      totals[key] = (totals[key] ?? 0) + f.qty;
    }

    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    return Object.entries(totals)
      .filter(([, v]) => v >= minQty)
      .map(([label, value], i) => ({
        value,
        color: PALETTE[i % PALETTE.length],
        label,
        pct: Math.round((value / total) * 100),
      }));
  }, [filteredFinds, groupBy, categoriesMap, filters.minQty]);

  const totalQty = filteredFinds.reduce((s, f) => s + f.qty, 0);
  const activeFilters = countActiveFilters(filters);

  // Finds à afficher dans la liste : filteredFinds dont le segment est dans pieData
  const pieLabels = useMemo(() => new Set(pieData.map(d => d.label)), [pieData]);

  const listFinds = useMemo(() => {
    if (filters.minQty === '') return filteredFinds;
    return filteredFinds.filter(f => {
      let key: string;
      if (groupBy === 'category') key = categoriesMap[f.categoryId]?.name ?? 'Sans catégorie';
      else if (groupBy === 'currency') key = f.currency;
      else key = f.type === 'piece' ? 'Pièces' : 'Billets';
      return pieLabels.has(key);
    });
  }, [filteredFinds, filters.minQty, groupBy, categoriesMap, pieLabels]);

  // ─── Helpers setState ──────────────────────────────────────────────────────

  const toggleSet = (key: 'excludedCategoryIds' | 'excludedTypes' | 'excludedCurrencies', value: string) => {
    setFilters(prev => {
      const next = new Set(prev[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // ─── Render ────────────────────────────────────────────────────────────────

  const inputBg = { backgroundColor: theme.backgroundElement, color: theme.text };
  const chipBase = [styles.chip, { backgroundColor: theme.backgroundElement }];
  const chipActive = { backgroundColor: '#208AEF' };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>Statistiques</ThemedText>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 24 }]}>

          {/* ── Panneau filtres ── */}
          <TouchableOpacity
            style={[styles.filterToggle, { backgroundColor: theme.backgroundElement }]}
            onPress={() => setFiltersOpen(o => !o)}
          >
            <ThemedText type="small">
              {filtersOpen ? '▲' : '▼'}{'  '}Filtres
              {activeFilters > 0 && (
                <ThemedText type="small" style={{ color: '#208AEF' }}> ({activeFilters} actif{activeFilters > 1 ? 's' : ''})</ThemedText>
              )}
            </ThemedText>
            {activeFilters > 0 && (
              <TouchableOpacity onPress={resetFilters} hitSlop={10}>
                <ThemedText type="small" style={{ color: '#e53e3e' }}>Réinitialiser</ThemedText>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {filtersOpen && (
            <View style={[styles.filterPanel, { backgroundColor: theme.backgroundElement }]}>

              {/* Date — Années */}
              {availableYears.length > 0 && (
                <>
                  <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Année</ThemedText>
                  <View style={styles.chips}>
                    {availableYears.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[...chipBase, filters.year === y && chipActive]}
                        onPress={() => setFilters(p => ({ ...p, year: p.year === y ? null : y, month: null, day: null }))}
                      >
                        <ThemedText type="small" style={filters.year === y ? { color: '#fff' } : undefined}>{y}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Date — Mois */}
              {filters.year !== null && availableMonths.length > 0 && (
                <>
                  <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Mois</ThemedText>
                  <View style={styles.chips}>
                    {availableMonths.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[...chipBase, filters.month === m && chipActive]}
                        onPress={() => setFilters(p => ({ ...p, month: p.month === m ? null : m, day: null }))}
                      >
                        <ThemedText type="small" style={filters.month === m ? { color: '#fff' } : undefined}>
                          {MONTHS_FR[m - 1]}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Date — Jours */}
              {filters.month !== null && availableDays.length > 0 && (
                <>
                  <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Jour</ThemedText>
                  <View style={styles.chips}>
                    {availableDays.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[...chipBase, filters.day === d && chipActive]}
                        onPress={() => setFilters(p => ({ ...p, day: p.day === d ? null : d }))}
                      >
                        <ThemedText type="small" style={filters.day === d ? { color: '#fff' } : undefined}>{d}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Type pièce/billet */}
              <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Type</ThemedText>
              <View style={styles.chips}>
                {(['piece', 'billet'] as FindType[]).map(t => {
                  const excluded = filters.excludedTypes.has(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[...chipBase, !excluded && chipActive]}
                      onPress={() => toggleSet('excludedTypes', t)}
                    >
                      <ThemedText type="small" style={!excluded ? { color: '#fff' } : undefined}>
                        {t === 'piece' ? '🪙 Pièces' : '💵 Billets'}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Devises */}
              {availableCurrencies.length > 0 && (
                <>
                  <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Devise</ThemedText>
                  <View style={styles.chips}>
                    {availableCurrencies.map(code => {
                      const excluded = filters.excludedCurrencies.has(code);
                      const curr = CURRENCIES.find(c => c.code === code);
                      return (
                        <TouchableOpacity
                          key={code}
                          style={[...chipBase, !excluded && chipActive]}
                          onPress={() => toggleSet('excludedCurrencies', code)}
                        >
                          <ThemedText type="small" style={!excluded ? { color: '#fff' } : undefined}>
                            {curr?.symbol ?? code} {code}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Quantité minimale */}
              <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>
                Quantité totale minimale par segment
              </ThemedText>
              <TextInput
                style={[styles.minQtyInput, inputBg]}
                value={filters.minQty}
                onChangeText={v => setFilters(p => ({ ...p, minQty: v }))}
                placeholder="Ex: 5"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />

              {/* Catégories */}
              {categoriesInFinds.length > 0 && (
                <>
                  <ThemedText type="small" style={[styles.filterLabel, { color: theme.textSecondary }]}>Catégories</ThemedText>
                  <TextInput
                    style={[styles.minQtyInput, inputBg, { marginBottom: 8 }]}
                    value={filters.categorySearch}
                    onChangeText={v => setFilters(p => ({ ...p, categorySearch: v }))}
                    placeholder="Rechercher…"
                    placeholderTextColor={theme.textSecondary}
                  />
                  {categoriesInFinds.map(cat => {
                    const excluded = filters.excludedCategoryIds.has(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.checkRow}
                        onPress={() => toggleSet('excludedCategoryIds', cat.id)}
                      >
                        <View style={[styles.checkbox, !excluded && { backgroundColor: '#208AEF', borderColor: '#208AEF' }]}>
                          {!excluded && <ThemedText type="small" style={{ color: '#fff', lineHeight: 16 }}>✓</ThemedText>}
                        </View>
                        <ThemedText type="default">{cat.name}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* ── Sélecteur groupBy ── */}
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>Regrouper par</ThemedText>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {GROUP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.toggleOption, groupBy === opt.key && { backgroundColor: theme.backgroundSelected }]}
                onPress={() => setGroupBy(opt.key)}
              >
                <ThemedText type="small">{opt.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Camembert ── */}
          {!loading && (pieData.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary">
                {finds.length === 0 ? 'Aucune trouvaille pour l\'instant' : 'Aucun résultat pour ces filtres'}
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

              <View style={styles.legend}>
                {pieData.map(item => (
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

              {/* Liste filtrée */}
              <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 24 }]}>
                Trouvailles ({listFinds.length})
              </ThemedText>
              <View style={styles.findList}>
                {listFinds.map((f, i) => (
                  <View key={f.id}>
                    <FindRow
                      find={f}
                      categoryName={categoriesMap[f.categoryId]?.name ?? '—'}
                      onPress={() => {}}
                    />
                    {i < listFinds.length - 1 && <View style={styles.separator} />}
                  </View>
                ))}
              </View>
            </>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  content: { paddingHorizontal: 16, gap: 4 },

  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  filterPanel: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  filterLabel: { marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  minQtyInput: { borderRadius: 10, padding: 12, fontSize: 15 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#aaa',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionLabel: { marginTop: 12, marginBottom: 8 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  toggleOption: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },

  chartWrapper: { alignItems: 'center', marginVertical: 24 },
  centerLabel: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },

  legend: { gap: 8 },
  findList: { gap: 0 },
  separator: { height: 8 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1 },
  legendRight: { flexDirection: 'row', alignItems: 'center' },
});
