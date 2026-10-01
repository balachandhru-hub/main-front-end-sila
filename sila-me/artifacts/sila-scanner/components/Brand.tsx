import { Image, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

const logoSource = require('@/assets/images/sila-logo-wide.png');

export function Brand({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Image source={logoSource} style={compact ? styles.compactLogo : styles.logo} resizeMode="contain" />
    </View>
  );
}

export function PoweredBy() {
  const colors = useColors();
  return (
    <Text style={[styles.powered, { color: colors.mutedForeground }]}>
      Powered by <Text style={styles.cas}>CAS</Text> (Chervic Advisory Services)
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 126, height: 42 },
  compactLogo: { width: 102, height: 32 },
  powered: { fontSize: 12, letterSpacing: 0.2 },
  cas: { color: '#D71920', fontWeight: '800' },
});