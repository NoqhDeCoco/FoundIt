import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { updateFind, deleteFind } from '@/services/finds';
import { createCategory, listCategories } from '@/services/categories';
import { CURRENCIES, FindType, Category, Find, Location as FindLocation } from '@/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  find: Find | null;
  initialCategoryName: string;
  onClose: () => void;
};

function timestampToFR(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  return [d.getDate(), d.getMonth() + 1, d.getFullYear()]
    .map((n) => String(n).padStart(2, '0'))
    .join('/');
}

function parseDateFR(text: string): Date | null {
  const [d, m, y] = text.split('/').map(Number);
  if (!d || !m || !y || y < 2000) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

export default function EditFindModal({ find, initialCategoryName, onClose }: Props) {
  const { user } = useAuth();
  const theme = useTheme();

  const [dateText, setDateText] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FindType>('piece');
  const [currency, setCurrency] = useState('EUR');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locLoading, setLocLoading] = useState(false);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pré-remplissage à l'ouverture
  useEffect(() => {
    if (!find) return;
    setDateText(timestampToFR(find.date));
    setCategoryName(initialCategoryName);
    setQty(String(find.qty));
    setAmount(String(find.amount));
    setType(find.type);
    setCurrency(find.currency);
    setLocationCoords(find.location ? { lat: find.location.lat, lng: find.location.lng } : null);
    setLocationLabel(find.location?.label ?? '');
    setError('');
  }, [find, initialCategoryName]);

  useEffect(() => {
    if (find && user) listCategories(user.uid).then(setAllCategories);
  }, [find, user]);

  const suggestions = categoryFocused && categoryName.trim().length > 0
    ? allCategories.filter((c) =>
        c.name.toLowerCase().includes(categoryName.trim().toLowerCase())
      )
    : [];

  const handleGeolocate = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('Impossible de récupérer la position.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !find) return;
    setError('');

    const parsedDate = parseDateFR(dateText);
    if (!parsedDate) { setError('Date invalide. Format : JJ/MM/AAAA'); return; }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Montant invalide.'); return; }

    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) { setError('Quantité invalide.'); return; }

    const catName = categoryName.trim() || 'Sans catégorie';

    setSaving(true);
    try {
      let cat = allCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (!cat) {
        cat = await createCategory(user.uid, { name: catName });
      }

      const location: FindLocation | undefined = locationCoords
        ? { ...locationCoords, ...(locationLabel.trim() ? { label: locationLabel.trim() } : {}) }
        : undefined;

      await updateFind(user.uid, find.id, {
        date: Timestamp.fromDate(parsedDate),
        categoryId: cat.id,
        type,
        currency,
        amount: parsedAmount,
        qty: parsedQty,
        ...(location ? { location } : { location: undefined }),
      });

      onClose();
    } catch {
      setError("Erreur lors de la sauvegarde. Réessaye.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la trouvaille',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!user || !find) return;
            try {
              await deleteFind(user.uid, find.id);
              onClose();
            } catch {
              setError("Erreur lors de la suppression.");
            }
          },
        },
      ]
    );
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency)!;
  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];
  const labelStyle = { color: theme.textSecondary };

  return (
    <Modal visible={find !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <ThemedText type="default" themeColor="textSecondary">Annuler</ThemedText>
            </TouchableOpacity>
            <ThemedText type="smallBold">Modifier</ThemedText>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={12}>
              {saving
                ? <ActivityIndicator color="#208AEF" />
                : <ThemedText type="smallBold" style={{ color: '#208AEF' }}>Enregistrer</ThemedText>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {/* Date */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Date</ThemedText>
            <TextInput
              style={inputStyle}
              value={dateText}
              onChangeText={setDateText}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
            />

            {/* Catégorie */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Catégorie</ThemedText>
            <TextInput
              style={inputStyle}
              value={categoryName}
              onChangeText={(t) => { setCategoryName(t); setCategoryFocused(true); }}
              onFocus={() => setCategoryFocused(true)}
              onBlur={() => setTimeout(() => setCategoryFocused(false), 150)}
              placeholder="Ex: Rue, Métro…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="sentences"
            />
            {suggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: theme.backgroundElement }]}>
                {suggestions.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.suggestionItem}
                    onPress={() => { setCategoryName(cat.name); setCategoryFocused(false); }}
                  >
                    <ThemedText type="default">{cat.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Type */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Type</ThemedText>
            <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
              {(['piece', 'billet'] as FindType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.toggleOption, type === t && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => setType(t)}
                >
                  <ThemedText type="small">{t === 'piece' ? '🪙 Pièce' : '💵 Billet'}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Montant + Quantité */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={[styles.label, labelStyle]}>Montant unitaire</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Ex: 0.10, 1, 50"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.qtyCol}>
                <ThemedText type="small" style={[styles.label, labelStyle]}>Quantité</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Devise */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Devise</ThemedText>
            <TouchableOpacity
              style={[inputStyle, styles.currencyBtn]}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <ThemedText type="default">{selectedCurrency.symbol} — {selectedCurrency.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">▾</ThemedText>
            </TouchableOpacity>

            {/* Localisation */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>
              Localisation <ThemedText type="small" themeColor="textSecondary">(optionnelle)</ThemedText>
            </ThemedText>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.geoBtn, { backgroundColor: theme.backgroundElement, flex: 1 }]}
                onPress={handleGeolocate}
                disabled={locLoading}
              >
                {locLoading
                  ? <ActivityIndicator size="small" color="#208AEF" />
                  : <ThemedText type="small" style={{ color: locationCoords ? '#208AEF' : theme.text }}>
                      {locationCoords
                        ? `📍 ${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)}`
                        : '📍 Me géolocaliser'}
                    </ThemedText>
                }
              </TouchableOpacity>
              {locationCoords && (
                <TouchableOpacity
                  style={[styles.geoBtn, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => { setLocationCoords(null); setLocationLabel(''); }}
                >
                  <ThemedText type="small" style={{ color: '#e53e3e' }}>✕</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {locationCoords && (
              <TextInput
                style={[inputStyle, { marginTop: 8 }]}
                value={locationLabel}
                onChangeText={setLocationLabel}
                placeholder="Libellé (ex: Gare Saint-Lazare)"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="sentences"
              />
            )}

            {error !== '' && (
              <ThemedText type="small" style={styles.error}>{error}</ThemedText>
            )}

            {/* Supprimer */}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <ThemedText type="small" style={{ color: '#e53e3e' }}>Supprimer cette trouvaille</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Currency Picker */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ marginBottom: 12 }}>Choisir une devise</ThemedText>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[styles.currencyOption, currency === c.code && { backgroundColor: theme.backgroundSelected }]}
                onPress={() => { setCurrency(c.code); setShowCurrencyPicker(false); }}
              >
                <ThemedText type="default">{c.symbol}</ThemedText>
                <ThemedText type="default" style={{ marginLeft: 12 }}>{c.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  form: { padding: 16, gap: 4 },
  label: { marginTop: 16, marginBottom: 6 },
  input: { borderRadius: 10, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  qtyCol: { width: 80 },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4 },
  toggleOption: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  currencyBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestions: { borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  geoBtn: { borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: {
    marginTop: 32,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e53e3e',
    borderRadius: 12,
  },
  error: { color: '#e53e3e', marginTop: 12, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
});
