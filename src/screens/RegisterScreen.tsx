import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseErrorMessage } from '@/utils/firebaseErrors';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type Props = {
  onGoToLogin: () => void;
};

export default function RegisterScreen({ onGoToLogin }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (e: any) {
      setError(getFirebaseErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.title}>Inscription</Text>

      <TextInput
        style={styles.input}
        placeholder="Adresse e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        textContentType="newPassword"
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer un compte</Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleSignInButton onError={setError} />

      <TouchableOpacity onPress={onGoToLogin}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 32, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#e53e3e', marginBottom: 8, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { color: '#999', fontSize: 13 },
  link: { color: '#208AEF', textAlign: 'center', marginTop: 20, fontSize: 15 },
});
