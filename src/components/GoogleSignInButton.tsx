import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

type Props = {
  onError?: (msg: string) => void;
};

export default function GoogleSignInButton({ onError }: Props) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      scopes: ['openid', 'email', 'profile'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
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
