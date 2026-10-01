import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Brand, PoweredBy } from '@/components/Brand';
import { Screen, Header, TabBar } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { getUnsyncedWorkSummary } from '@/data/local/database';

export default function SettingsScreen() {
  const colors = useColors();
  const { user, customer, property, department, logout } = useAppState();
  const handleLogout = async () => {
    const summary = await getUnsyncedWorkSummary().catch(() => ({ drafts: 0, uploads: 0 }));
    const pending = summary.drafts + summary.uploads;
    if (!pending) {
      await logout();
      router.replace('/');
      return;
    }
    Alert.alert(
      'Unsynced work on this device',
      `${pending} local item${pending === 1 ? '' : 's'} will remain available for recovery. Server submission will not happen under the next user session.`,
      [
        { text: 'Stay signed in', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void logout().then(() => router.replace('/'));
          },
        },
      ],
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Settings" subtitle="Manage your SILA Store workspace" />
        <View style={styles.brandHeader}><Brand /><Text style={[styles.brandTagline, { color: colors.primary }]}>Scan. Receive. Count. Control.</Text></View>
        <SettingsSection title="ACCOUNT">
          <SettingRow icon="person-outline" label={user.name} detail={user.email} />
          <SettingRow icon="shield-checkmark-outline" label={user.role} detail="Assigned in the SILA Cloud admin app" />
          <SettingRow icon="business-outline" label={customer} detail="Customer workspace" />
        </SettingsSection>
        <SettingsSection title="CURRENT LOCATION">
          <SettingRow icon="location-outline" label="Property" detail={property} />
          <SettingRow icon="file-tray-outline" label="Store / Department" detail={department} />
        </SettingsSection>
        <SettingsSection title="UPLOAD">
          <SettingRow icon="cloud-upload-outline" label="Pending uploads" detail="3 documents waiting" trailing={<Feather name="chevron-right" size={17} color={colors.mutedForeground} />} onPress={() => router.push('/pending')} />
          <SettingRow icon="checkmark-circle-outline" label="SharePoint connection" detail="Demo connection active" trailing={<View style={[styles.connected, { backgroundColor: colors.lightGreen }]}><Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text></View>} />
        </SettingsSection>
        <SettingsSection title="APPLICATION">
          <SettingRow icon="shield-checkmark-outline" label="Privacy" detail="Enterprise document security" />
           <SettingRow icon="information-circle-outline" label="About SILA Store" detail="Version 1.0.0" />
        </SettingsSection>
         <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={[styles.logout, { borderColor: colors.destructive }]}><Ionicons name="log-out-outline" size={18} color={colors.destructive} /><Text style={[styles.logoutText, { color: colors.destructive }]}>Log out</Text></Pressable>
        <View style={styles.footer}><PoweredBy /></View>
      </Screen>
      <TabBar active="more" />
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text><View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View></View>;
}

function SettingRow({ icon, label, detail, trailing, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; trailing?: React.ReactNode; onPress?: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} style={styles.row}><View style={[styles.rowIcon, { backgroundColor: colors.lightBlue }]}><Ionicons name={icon} size={17} color={colors.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={[styles.rowLabel, { color: colors.navy }]}>{label}</Text><Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text></View>{trailing}</Pressable>;
}

const styles = StyleSheet.create({
  brandHeader: { alignItems: 'center', gap: 10, paddingVertical: 3 },
  brandTagline: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800', paddingLeft: 3 },
  sectionCard: { borderRadius: 19, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 67, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#DDE4E8' },
  rowIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 13, fontWeight: '700' },
  rowDetail: { fontSize: 11 },
  connected: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  connectedText: { fontSize: 10, fontWeight: '700' },
  logout: { height: 49, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { fontSize: 13, fontWeight: '700' },
  footer: { alignItems: 'center', paddingTop: 2 },
});