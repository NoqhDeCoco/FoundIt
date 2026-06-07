import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Timestamp, collection, doc } from 'firebase/firestore';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { createFindGroup } from '@/services/finds';
import { createCategory, listCategories } from '@/services/categories';
import { db } from '@/services/firebase';
import { CURRENCIES, FindType, Category, Location as FindLocation } from '@/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Bloc = {
  key: string;
  qty: string;
  amount: string;
  type: FindType;
  currency: string;
};

function newBloc(): Bloc {
  return { key: Math.random().toString(36).slice(2), qty: '1', amount: '', type: 'piece', currency: 'EUR' };
}

function todayFR(): string {
  const d = new Date();
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

export default function AddFindModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const theme = useTheme();

  const [dateText, setDateText] = useState(todayFR());
  const [categoryName, setCategoryName] = useState('');
  const [blocs, setBlocs] = useState<Bloc[]>([newBloc()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [currencyPickerFor, setCurrencyPickerFor] = useState<string | null>(null);

  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      listCategories(user.uid).then(setAllCategories);
    }
  }, [visible, user]);

  const suggestions = categoryFocused && categoryName.trim().length > 0
    ? allCategories.filter((c) =>
        c.name.toLowerCase().includes(categoryName.trim().toLowerCase())
      )
    : [];

  // ─── Blocs helpers ───────────────────────────────────────────────────────────

  const updateBloc = (key: string, patch: Partial<Bloc>) =>
    setBlocs((prev) => prev.map((b) => b.key === key ? { ...b, ...patch } : b));

  const addBloc = () => setBlocs((prev) => [...prev, newBloc()]);

  const removeBloc = (key: string) =>
    setBlocs((prev) => prev.filter((b) => b.key !== key));

  // ─── Reset ───────────────────────────────────────────────────────────────────

  const handleGeolocate = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée. Autorise-la dans les paramètres de ton téléphone.');
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

  const reset = () => {
    setDateText(todayFR());
    setCategoryName('');
    setBlocs([newBloc()]);
    setError('');
    setCategoryFocused(false);
    setLocationCoords(null);
    setLocationLabel('');
  };

  const handleClose = () => { reset(); onClose(); };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;
    setError('');

    const parsedDate = parseDateFR(dateText);
    if (!parsedDate) { setError('Date invalide. Format : JJ/MM/AAAA'); return; }

    for (const b of blocs) {
      const a = parseFloat(b.amount.replace(',', '.'));
      if (isNaN(a) || a <= 0) { setError('Un montant est invalide.'); return; }
      const q = parseInt(b.qty, 10);
      if (isNaN(q) || q <= 0) { setError('Une quantité est invalide.'); return; }
    }

    const catName = categoryName.trim() || 'Sans catégorie';

    setLoading(true);
    try {
      let cat = allCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (!cat) {
        cat = await createCategory(user.uid, { name: catName });
        setAllCategories((prev) => [...prev, cat!]);
      }

      const groupId = doc(collection(db, '_')).id;
      const date = Timestamp.fromDate(parsedDate);

      const location: FindLocation | undefined = locationCoords
        ? { ...locationCoords, ...(locationLabel.trim() ? { label: locationLabel.trim() } : {}) }
        : undefined;

      await createFindGroup(
        user.uid,
        blocs.map((b) => ({
          groupId,
          date,
          categoryId: cat!.id,
          type: b.type,
          currency: b.currency,
          amount: parseFloat(b.amount.replace(',', '.')),
          qty: parseInt(b.qty, 10),
          ...(location ? { location } : {}),
        }))
      );

      handleClose();
    } catch {
      setError("Erreur lors de l'enregistrement. Réessaye.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Styles dynamiques ───────────────────────────────────────────────────────

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];
  const labelStyle = { color: theme.textSecondary };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <ThemedText type="default" themeColor="textSecondary">Annuler</ThemedText>
            </TouchableOpacity>
            <ThemedText type="smallBold">Nouvelle trouvaille</ThemedText>
            <TouchableOpacity onPress={handleSubmit} disabled={loading} hitSlop={12}>
              {loading
                ? <ActivityIndicator color="#208AEF" />
                : <ThemedText type="smallBold" style={{ color: '#208AEF' }}>Ajouter</ThemedText>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

            {/* ── Champs communs ── */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Date</ThemedText>
            <View style={styles.row}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                value={dateText}
                onChangeText={setDateText}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity
                style={[styles.todayBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={() => setDateText(todayFR())}
              >
                <ThemedText type="small">Aujourd'hui</ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText type="small" style={[styles.label, labelStyle]}>Catégorie</ThemedText>
            <TextInput
              style={inputStyle}
              value={categoryName}
              onChangeText={(t) => { setCategoryName(t); setCategoryFocused(true); }}
              onFocus={() => setCategoryFocused(true)}
              onBlur={() => setTimeout(() => setCategoryFocused(false), 150)}
              placeholder="Ex: Rue, Métro, Supermarché…"
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

            {/* ── Localisation (optionnelle) ── */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Localisation <ThemedText type="small" themeColor="textSecondary">(optionnelle)</ThemedText></ThemedText>
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

            {/* ── Blocs monnaies ── */}
            <View style={styles.blocsHeader}>
              <ThemedText type="small" style={labelStyle}>Monnaies trouvées</ThemedText>
            </View>

            {blocs.map((bloc, index) => {
              const curr = CURRENCIES.find((c) => c.code === bloc.currency)!;
              return (
                <View
                  key={bloc.key}
                  style={[styles.bloc, { backgroundColor: theme.backgroundElement }]}
                >
                  {/* En-tête du bloc */}
                  <View style={styles.blocHeader}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Monnaie {index + 1}
                    </ThemedText>
                    {blocs.length > 1 && (
                      <TouchableOpacity onPress={() => removeBloc(bloc.key)} hitSlop={10}>
                        <ThemedText type="small" style={{ color: '#e53e3e' }}>✕ Supprimer</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Type */}
                  <View style={[styles.toggle, { backgroundColor: theme.background }]}>
                    {(['piece', 'billet'] as FindType[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.toggleOption, bloc.type === t && { backgroundColor: theme.backgroundSelected }]}
                        onPress={() => updateBloc(bloc.key, { type: t })}
                      >
                        <ThemedText type="small">{t === 'piece' ? '🪙 Pièce' : '💵 Billet'}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Montant + Quantité */}
                  <View style={[styles.row, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="small" style={[{ marginBottom: 6 }, labelStyle]}>Montant unitaire</ThemedText>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        value={bloc.amount}
                        onChangeText={(v) => updateBloc(bloc.key, { amount: v })}
                        placeholder="Ex: 0.10, 1, 50"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.qtyCol}>
                      <ThemedText type="small" style={[{ marginBottom: 6 }, labelStyle]}>Qté</ThemedText>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        value={bloc.qty}
                        onChangeText={(v) => updateBloc(bloc.key, { qty: v })}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* Devise */}
                  <ThemedText type="small" style={[{ marginTop: 10, marginBottom: 6 }, labelStyle]}>Devise</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, styles.currencyBtn, { backgroundColor: theme.background }]}
                    onPress={() => setCurrencyPickerFor(bloc.key)}
                  >
                    <ThemedText type="default">{curr.symbol} — {curr.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">▾</ThemedText>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Bouton ajouter un bloc */}
            <TouchableOpacity
              style={[styles.addBlocBtn, { borderColor: theme.backgroundSelected }]}
              onPress={addBloc}
            >
              <ThemedText type="small" style={{ color: '#208AEF' }}>+ Ajouter une monnaie</ThemedText>
            </TouchableOpacity>

            {error !== '' && (
              <ThemedText type="small" style={styles.error}>{error}</ThemedText>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyPickerFor(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCurrencyPickerFor(null)}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ marginBottom: 12 }}>Choisir une devise</ThemedText>
            {CURRENCIES.map((c) => {
              const currentCode = blocs.find((b) => b.key === currencyPickerFor)?.currency;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyOption, currentCode === c.code && { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    if (currencyPickerFor) updateBloc(currencyPickerFor, { currency: c.code });
                    setCurrencyPickerFor(null);
                  }}
                >
                  <ThemedText type="default">{c.symbol}</ThemedText>
                  <ThemedText type="default" style={{ marginLeft: 12 }}>{c.label}</ThemedText>
                </TouchableOpacity>
              );
            })}
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
  todayBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
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
  blocsHeader: { marginTop: 20, marginBottom: 8 },
  bloc: { borderRadius: 14, padding: 14, marginBottom: 10 },
  blocHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  geoBtn: { borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  addBlocBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  error: { color: '#e53e3e', marginTop: 12, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
});
