const errorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Cette adresse e-mail est déjà utilisée.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/user-not-found': 'Aucun compte trouvé avec cet e-mail.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
};

export function getFirebaseErrorMessage(code: string): string {
  return errorMessages[code] ?? 'Une erreur est survenue. Réessayez.';
}
