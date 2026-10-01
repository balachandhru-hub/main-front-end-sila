import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function Screen({
  children,
  scroll = true,
  contentStyle,
  ...props
}: ScrollViewProps & { scroll?: boolean; contentStyle?: ViewStyle }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + (Platform.OS === 'web' ? 67 : 18);
  const style = [styles.content, { paddingTop, paddingBottom: insets.bottom + 104 }, contentStyle];
  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={style}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      {...props}
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={style}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card }, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.navy} />
          </Pressable>
        ) : null}
        <View>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>{title}</Text>
          {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  testID,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.primary },
        (pressed || disabled || loading) && { opacity: disabled ? 0.5 : 0.82 },
      ]}
    >
      {icon ? <Feather name={icon} size={19} color={colors.primaryForeground} /> : null}
      <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
        {loading ? 'Preparing...' : label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: colors.primary, backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={colors.primary} /> : null}
      <Text style={[styles.secondaryLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.navy }]}>{children}</Text>
      {action ? <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text> : null}
    </View>
  );
}

export function TabBar({ active }: { active: 'home' | 'receive' | 'inventory' | 'history' | 'more' }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabs = [
    { key: 'home', label: 'Home', icon: 'home-outline', route: '/home' },
    { key: 'receive', label: 'Receive', icon: 'cube-outline', route: '/receive' },
    { key: 'inventory', label: 'Inventory', icon: 'barcode-outline', route: '/inventory' },
    { key: 'history', label: 'History', icon: 'time-outline', route: '/history' },
    { key: 'more', label: 'More', icon: 'ellipsis-horizontal-circle-outline', route: '/more' },
  ] as const;
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 10), backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            accessibilityRole="button"
            key={tab.key}
            onPress={() => router.replace(tab.route)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons name={tab.icon} size={21} color={selected ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: selected ? colors.primary : colors.mutedForeground }, selected && styles.tabSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InfoPill({ icon, label, tone = 'blue' }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone?: 'blue' | 'green' | 'orange' }) {
  const colors = useColors();
  const palette = tone === 'green' ? { bg: colors.lightGreen, text: colors.success } : tone === 'orange' ? { bg: '#FFF6E5', text: colors.warning } : { bg: colors.lightBlue, text: colors.primary };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Ionicons name={icon} size={14} color={palette.text} />
      <Text style={[styles.pillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export const screenStyles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, borderWidth: 1 },
  mutedText: { fontSize: 13, lineHeight: 19 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, marginTop: 3 },
  backButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDE4E8' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  primaryButton: { height: 56, paddingHorizontal: 20, borderRadius: 18, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  secondaryButton: { height: 52, paddingHorizontal: 18, borderRadius: 17, borderWidth: 1.5, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { fontSize: 14, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionAction: { fontSize: 12, fontWeight: '700' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 76, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
  tab: { alignItems: 'center', gap: 5, minWidth: 62 },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  tabSelected: { fontWeight: '700' },
  pill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
});