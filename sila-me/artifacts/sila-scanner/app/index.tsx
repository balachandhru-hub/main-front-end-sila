import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, PoweredBy } from '@/components/Brand';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { getAuthErrorMessage } from '@/services/api';

const logoSource = require('@/assets/images/sila-logo-wide.png');

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isAuthenticated,
    authLoading,
    loginWithLocal,
  } = useAppState();
  const [showSplash, setShowSplash] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.replace('/home');
  }, [isAuthenticated]);

  if (showSplash || authLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.card, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Image source={logoSource} style={styles.splashLogo} resizeMode="contain" />
        <Text style={[styles.splashTitle, { color: colors.navy }]}>SILA Store</Text>
        <Text style={[styles.splashTagline, { color: colors.primary }]}>Scan. Receive. Count. Control.</Text>
        <Text style={[styles.splashDescriptor, { color: colors.mutedForeground }]}>AI-Powered Store & Inventory Operations</Text>
        <View style={styles.splashFooter}><PoweredBy /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.brandWrap}>
        <Brand />
        <View style={[styles.securePill, { backgroundColor: colors.lightGreen }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
          <Text style={[styles.secureText, { color: colors.success }]}>Enterprise secure</Text>
        </View>
      </View>
      <View style={styles.loginBody}>
        <View style={[styles.illustration, { backgroundColor: colors.lightBlue }]}>
          <View style={[styles.illustrationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={32} color={colors.primary} />
            <View style={[styles.scanLine, { backgroundColor: colors.green }]} />
            <View style={[styles.scanLineShort, { backgroundColor: colors.border }]} />
            <View style={[styles.scanLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.illustrationBadge, { backgroundColor: colors.green }]}>
            <Ionicons name="checkmark" size={20} color={colors.card} />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.navy }]}>Welcome to SILA Store</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Smart receiving, inventory and store operations connected to your enterprise systems.</Text>
        <View style={styles.localFields}>
          <TextInput
            accessibilityLabel="SILA user ID or email"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="SILA user ID or email"
            placeholderTextColor={colors.mutedForeground}
            value={login}
            onChangeText={(value) => {
              setLogin(value);
              if (loginError) setLoginError(null);
            }}
            style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (loginError) setLoginError(null);
            }}
            style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]}
          />
          <Pressable
            accessibilityRole="button"
            testID="local-sign-in-button"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setLoginError(null);
              try {
                await loginWithLocal(login, password);
              } catch (error) {
                setLoginError(getAuthErrorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
            style={({ pressed }) => [styles.localButton, { borderColor: colors.primary }, pressed && styles.pressed]}
          >
            <Text style={[styles.localButtonLabel, { color: colors.primary }]}>
              {busy ? 'Signing in…' : 'Sign in with SILA User Login'}
            </Text>
          </Pressable>
          {loginError ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[styles.loginError, { color: colors.destructive }]}
            >
              {loginError}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          Sign in to access your configured enterprise workspace. Your role and store access are resolved by SILA after authentication.
        </Text>
      </View>
      <View style={styles.footer}><PoweredBy /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 240, height: 88, marginBottom: 24 },
  splashTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  splashTagline: { fontSize: 15, fontWeight: '600', marginTop: 9, letterSpacing: 0.4 },
  splashDescriptor: { fontSize: 12, marginTop: 8 },
  splashFooter: { position: 'absolute', bottom: 44 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  brandWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  securePill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { fontSize: 11, fontWeight: '700' },
  loginBody: { alignItems: 'center', gap: 15 },
  illustration: { width: 142, height: 142, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  illustrationCard: { width: 72, height: 88, borderRadius: 9, borderWidth: 1, padding: 12, alignItems: 'center', gap: 7 },
  scanLine: { width: 48, height: 5, borderRadius: 4 },
  scanLineShort: { width: 34, height: 5, borderRadius: 4 },
  illustrationBadge: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 12, bottom: 14 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '700', textAlign: 'center', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 290 },
  localFields: { width: '100%', gap: 8 },
  input: { width: '100%', height: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 13 },
  localButton: { width: '100%', height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  localButtonLabel: { fontSize: 13, fontWeight: '700' },
  loginError: { width: '100%', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  privacy: { textAlign: 'center', fontSize: 11, lineHeight: 17, maxWidth: 320, marginTop: 3 },
  footer: { alignItems: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});