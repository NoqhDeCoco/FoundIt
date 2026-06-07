import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onError?: (msg: string) => void;
};

export default function GoogleSignInButton({ onError }: Props) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        onError?.('Connexion Google échouée.');
        return;
      }
      setLoading(true);
      signInWithGoogle(idToken)
        .catch(() => onError?.('Connexion Google échouée.'))
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      onError?.('Connexion Google échouée.');
    }
  }, [response]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => promptAsync()}
      disabled={!request || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#444" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.logo}>G</Text>
          <Text style={styles.label}>Continuer avec Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
});
