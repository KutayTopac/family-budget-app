import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import type { HouseholdSummary, Invitation } from '@/features/households/application/household-gateway';
import { createHouseholdService } from '@/features/households/application/household-service';
import { supabaseHouseholdGateway } from '@/features/households/infrastructure/supabase-household-gateway';
import { FormField } from '@/shared/components/FormField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';
import { useAppStore } from '@/store/app-store';
import { authService, useAuthStore } from '@/store/auth-store';

const householdService = createHouseholdService(supabaseHouseholdGateway);

export default function HouseholdScreen() {
  const session = useAuthStore((state) => state.session);
  const setActiveHouseholdId = useAppStore((state) => state.setActiveHouseholdId);
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [name, setName] = useState('Ailemiz');
  const [code, setCode] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'create' | 'accept' | 'invite' | 'signout' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  const loadHousehold = useCallback(async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const result = await householdService.findMine(userId);
      setHousehold(result);
      setActiveHouseholdId(result?.id ?? null);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [setActiveHouseholdId, userId]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadHousehold(); }, 0);
    return () => clearTimeout(timer);
  }, [loadHousehold]);

  const expiryText = useMemo(() => invitation
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(invitation.expiresAt))
    : null, [invitation]);

  async function run(type: NonNullable<typeof action>, work: () => Promise<void>) {
    setAction(type); setError(null);
    try { await work(); } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setAction(null); }
  }

  async function createHousehold() {
    await run('create', async () => {
      await householdService.create(name, 'TRY');
      await loadHousehold();
    });
  }

  async function acceptInvitation() {
    await run('accept', async () => {
      await householdService.acceptInvitation(code);
      setCode('');
      await loadHousehold();
    });
  }

  async function createInvitation() {
    if (!household) return;
    await run('invite', async () => setInvitation(await householdService.createInvitation(household.id)));
  }

  async function shareInvitation() {
    if (!invitation) return;
    await Share.share({ message: `Aile Bütçesi aile hesabımıza katılmak için davet kodu: ${invitation.code}` });
  }

  async function signOut() {
    await run('signout', async () => { await authService.signOut(); router.replace('/sign-in'); });
  }

  if (loading) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headingCopy}><Text style={styles.eyebrow}>AİLE BÜTÇESİ</Text><Text style={styles.title}>{household ? household.name : 'Ailenizi bağlayın'}</Text></View>
          <PrimaryButton label="Çıkış" variant="secondary" loading={action === 'signout'} onPress={() => void signOut()} />
        </View>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

        {household ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>AKTİF AİLE HESABI</Text>
              <Text style={styles.cardTitle}>{household.name}</Text>
              <Text style={styles.meta}>{household.baseCurrency} · {household.role === 'owner' ? 'Yönetici' : 'Üye'}</Text>
            </View>
            <PrimaryButton label="Gelir veya gider ekle" onPress={() => router.push('/transaction/new')} />
            {household.role === 'owner' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Eşinizi davet edin</Text>
                <Text style={styles.help}>Yeni kod oluşturulduğunda önceki kullanılmamış kod iptal edilir. Kod 24 saat geçerlidir.</Text>
                <PrimaryButton label="Güvenli davet kodu oluştur" loading={action === 'invite'} onPress={() => void createInvitation()} />
                {invitation && (
                  <View style={styles.invitation}>
                    <Text style={styles.invitationCode} selectable>{invitation.code}</Text>
                    <Text style={styles.meta}>Son geçerlilik: {expiryText}</Text>
                    <PrimaryButton label="Kodu paylaş" variant="secondary" onPress={() => void shareInvitation()} />
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Yeni aile hesabı oluşturun</Text>
              <Text style={styles.help}>İlk kullanıcı yönetici olur ve eşini davet edebilir.</Text>
              <FormField label="Aile adı" value={name} onChangeText={setName} autoCapitalize="words" />
              <PrimaryButton label="Aile hesabını oluştur" loading={action === 'create'} onPress={() => void createHousehold()} />
            </View>
            <View style={styles.dividerRow}><View style={styles.line} /><Text style={styles.or}>VEYA</Text><View style={styles.line} /></View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Davet koduyla katılın</Text>
              <Text style={styles.help}>Eşinizin uygulamada oluşturduğu 16 karakterli kodu girin.</Text>
              <FormField label="Davet kodu" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="AB12-CD34-EF56-7890" />
              <PrimaryButton label="Aile hesabına katıl" loading={action === 'accept'} onPress={() => void acceptInvitation()} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 22, gap: 22 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, headingCopy: { flex: 1, gap: 4 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  error: { color: colors.danger, backgroundColor: '#FDECEC', borderRadius: 12, padding: 12, lineHeight: 20 },
  card: { backgroundColor: colors.accent, borderRadius: 22, padding: 22, gap: 7 }, cardLabel: { color: '#DCECF4', fontWeight: '800', fontSize: 11, letterSpacing: 1.1 },
  cardTitle: { color: colors.surface, fontSize: 28, fontWeight: '800' }, meta: { color: colors.textMuted, fontSize: 13 },
  section: { backgroundColor: colors.surface, borderRadius: 20, padding: 19, gap: 14, borderWidth: 1, borderColor: colors.border }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  help: { color: colors.textMuted, lineHeight: 21 }, invitation: { backgroundColor: colors.background, borderRadius: 16, padding: 16, gap: 11 }, invitationCode: { color: colors.text, fontSize: 23, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, line: { height: 1, backgroundColor: colors.border, flex: 1 }, or: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
});
