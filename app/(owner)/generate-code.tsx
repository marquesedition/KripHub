import { useFocusEffect } from 'expo-router';
import { Check, Copy, Infinity, KeyRound, RefreshCw, ShieldOff, Timer } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { PageHeader } from '../../src/components/PageHeader';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { Surface } from '../../src/components/Surface';
import { TextField } from '../../src/components/TextField';
import { colors } from '../../src/constants/theme';
import {
  ACCESS_DURATION_OPTIONS,
  createAccessCode,
  listAccessCodes,
  revokeAccessCode,
} from '../../src/services/accessCodes';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { listOwnerCollections } from '../../src/services/media';
import type { AccessCode, AccessType, Collection } from '../../src/types/domain';
import { formatAccessType, formatDateTime } from '../../src/utils/format';

export default function GenerateCodeScreen() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<AccessType>('temporary');
  const [duration, setDuration] = useState(String(ACCESS_DURATION_OPTIONS[0].minutes));
  const [maxUses, setMaxUses] = useState('1');
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextCodes, nextCollections] = await Promise.all([
        listAccessCodes(),
        listOwnerCollections(),
      ]);
      setCodes(nextCodes);
      setCollections(nextCollections);
      setCollectionId((current) => current ?? nextCollections[0]?.id ?? null);
    } catch (error) {
      Alert.alert('No se pudieron cargar los códigos', await getApiErrorMessage(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function createCode() {
    if (!collectionId) {
      return;
    }

    setLoading(true);

    try {
      const result = await createAccessCode({
        accessType,
        collectionId,
        durationMinutes: accessType === 'temporary' ? Number(duration) : null,
        maxUses: maxUses ? Number(maxUses) : null,
      });
      setLatestCode(result.code);
      await load();
    } catch (error) {
      Alert.alert('No se pudo crear el código', await getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    try {
      await revokeAccessCode(id);
      await load();
    } catch (error) {
      Alert.alert('No se pudo revocar el código', await getApiErrorMessage(error));
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Propietario"
        icon={KeyRound}
        title="Generar código"
        meta="El código desbloquea una carpeta concreta. Solo se guarda su hash."
      />

      <Surface className="gap-4">
        <Text className="text-lg font-extrabold text-hub-text">Carpeta</Text>
        <FlatList
          horizontal
          data={collections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="Sin carpetas" body="Crea una carpeta para poder compartirla." />
          }
          ItemSeparatorComponent={() => <View className="w-2" />}
          renderItem={({ item }) => {
            const active = item.id === collectionId;
            return (
              <Pressable
                onPress={() => setCollectionId(item.id)}
                className={`flex-row items-center gap-1 rounded-lg border px-3 py-2 ${
                  active ? 'border-hub-accent bg-hub-muted' : 'border-hub-border'
                }`}
              >
                {active ? <Check color={colors.accent} size={16} strokeWidth={2.4} /> : null}
                <Text className={active ? 'font-bold text-hub-accent' : 'font-bold text-hub-soft'}>
                  {item.title}
                </Text>
              </Pressable>
            );
          }}
        />

        <View className="flex-row gap-3">
          <Button
            icon={Timer}
            onPress={() => setAccessType('temporary')}
            style={{ flex: 1 }}
            variant={accessType === 'temporary' ? 'primary' : 'secondary'}
          >
            Temporal
          </Button>
          <Button
            icon={Infinity}
            onPress={() => setAccessType('permanent')}
            style={{ flex: 1 }}
            variant={accessType === 'permanent' ? 'primary' : 'secondary'}
          >
            Definitivo
          </Button>
        </View>

        {accessType === 'temporary' ? (
          <View className="gap-3">
            <FlatList
              horizontal
              data={ACCESS_DURATION_OPTIONS}
              keyExtractor={(item) => String(item.minutes)}
              ItemSeparatorComponent={() => <View className="w-2" />}
              renderItem={({ item }) => {
                const active = duration === String(item.minutes);
                return (
                  <Pressable
                    onPress={() => setDuration(String(item.minutes))}
                    className={`rounded-lg border px-3 py-2 ${
                      active ? 'border-hub-accent bg-hub-muted' : 'border-hub-border'
                    }`}
                  >
                    <Text className={active ? 'font-bold text-hub-accent' : 'font-bold text-hub-soft'}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <TextField keyboardType="number-pad" label="Duración personalizada en minutos" onChangeText={setDuration} value={duration} />
          </View>
        ) : null}

        <TextField
          keyboardType="number-pad"
          label="Usos máximos"
          onChangeText={setMaxUses}
          value={maxUses}
        />

        <Button disabled={!collectionId || loading} icon={RefreshCw} loading={loading} onPress={createCode}>
          Generar código
        </Button>

        {latestCode ? (
          <View className="gap-2 rounded-lg border border-hub-accent bg-hub-panel p-4">
            <View className="flex-row items-center justify-between">
              <StatusPill label="Nuevo" tone="warning" />
              <Copy color={colors.textMuted} size={17} strokeWidth={2.4} />
            </View>
            <Text selectable className="text-[22px] font-extrabold text-hub-text">
              {latestCode}
            </Text>
          </View>
        ) : null}
      </Surface>

      <FlatList
        data={codes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState title="Sin códigos" body="Genera un código para compartir una carpeta." />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View className="gap-3 rounded-xl border border-hub-border bg-hub-row p-5">
            <View className="flex-row items-center justify-between">
              <StatusPill
                label={item.status}
                tone={item.status === 'active' ? 'success' : item.status === 'revoked' ? 'danger' : 'warning'}
              />
              <StatusPill label={formatAccessType(item.access_type)} tone={item.access_type === 'permanent' ? 'info' : 'warning'} />
            </View>
            <Text className="text-[13px] text-hub-soft">
              Usos {item.used_count}/{item.max_uses ?? '∞'} · {formatDateTime(item.expires_at)}
            </Text>
            {item.status !== 'revoked' ? (
              <Button icon={ShieldOff} variant="danger" onPress={() => revoke(item.id)}>
                Revocar código
              </Button>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
