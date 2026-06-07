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

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { createFind } from '@/services/finds';
import { createCategory, listCategories } from '@/services/categories';
import { db } from '@/services/firebase';
import { CURRENCIES, FindType, Category } from '@/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function todayFR(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
  const [qty, setQty] = useState('1');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FindType>('piece');
  const [currency, setCurrency] = useState('EUR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoryFocused, setCategoryFocused] = useState(false);

  // Charge les catégories à l'ouverture du modal
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

  const selectCategory = (cat: Category) => {
    setCategoryName(cat.name);
    setCategoryFocused(false);
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency)!;

  const reset = () => {
    setDateText(todayFR());
    setCategoryName('');
    setQty('1');
    setAmount('');
    setType('piece');
    setCurrency('EUR');
    setError('');
    setCategoryFocused(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError('');

    const parsedDate = parseDateFR(dateText);
    if (!parsedDate) { setError('Date invalide. Format : JJ/MM/AAAA'); return; }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Montant invalide.'); return; }

    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) { setError('Quantité invalide.'); return; }

    const catName = categoryName.trim() || 'Sans catégorie';

    setLoading(true);
    try {
      // Trouve ou crée la catégorie (insensible à la casse, sans doublon)
      let cat = allCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (!cat) {
        cat = await createCategory(user.uid, { name: catName });
        setAllCategories((prev) => [...prev, cat!]);
      }

      const groupId = doc(collection(db, '_')).id;

      await createFind(user.uid, {
        groupId,
        date: Timestamp.fromDate(parsedDate),
        categoryId: cat.id,
        type,
        currency,
        amount: parsedAmount,
        qty: parsedQty,
      });

      handleClose();
    } catch {
      setError("Erreur lors de l'enregistrement. Réessaye.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];
  const labelStyle = { color: theme.textSecondary };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
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
            {/* Date */}
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

            {/* Catégorie avec autocomplete */}
            <ThemedText type="small" style={[styles.label, labelStyle]}>Catégorie</ThemedText>
            <TextInput
              style={inputStyle}
              value={categoryName}
              onChangeText={(text) => { setCategoryName(text); setCategoryFocused(true); }}
              onFocus={() => setCategoryFocused(true)}
              onBlur={() => {
                // Délai pour laisser le temps au onPress de la suggestion de se déclencher
                setTimeout(() => setCategoryFocused(false), 150);
              }}
              placeholder="Ex: Rue, Métro, Supermarché…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="sentences"
            />

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: theme.backgroundElement }]}>
                {suggestions.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.suggestionItem}
                    onPress={() => selectCategory(cat)}
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

            {error !== '' && (
              <ThemedText type="small" style={styles.error}>{error}</ThemedText>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Currency Picker Modal */}
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
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
  todayBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyCol: { width: 80 },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  currencyBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestions: {
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  error: { color: '#e53e3e', marginTop: 12, textAlign: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
