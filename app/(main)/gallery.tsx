import { router, useFocusEffect } from 'expo-router';
import { Folder, KeyRound, Plus, RefreshCw, UserCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { PageHeader } from '../../src/components/PageHeader';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/constants/theme';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { listGalleryCollections } from '../../src/services/media';
import { clearExpiredLocalAccess } from '../../src/services/session';
import type { GalleryCollection } from '../../src/types/domain';
import { formatAccessType, formatDateTime } from '../../src/utils/format';

export default function GalleryScreen() {
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);

    try {
      await clearExpiredLocalAccess();
      setCollections(await listGalleryCollections());
    } catch (error) {
      Alert.alert('No se pudo cargar la galería', await getApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen scroll={false}>
      <View className="gap-4">
        <PageHeader
          eyebrow="Biblioteca"
          icon={Folder}
          title="Galería"
          meta={`${collections.length} carpeta${collections.length === 1 ? '' : 's'} visible${
            collections.length === 1 ? '' : 's'
          }`}
        />
        <View className="flex-row gap-3">
          <Button icon={KeyRound} onPress={() => router.push('/unlock-code')} style={{ flex: 1 }}>
            Código
          </Button>
          <Button
            icon={Plus}
            onPress={() => router.push('/create-folder')}
            style={{ flex: 1 }}
            variant="secondary"
          >
            Crear
          </Button>
          <Pressable
            onPress={() => router.push('/profile')}
            className="h-12 w-12 items-center justify-center rounded-lg border border-hub-border bg-hub-muted"
          >
            <UserCircle color={colors.text} size={21} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={load} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Galería vacía"
            body="Introduce un código válido o crea tu primera carpeta para empezar."
          />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/folder/[id]', params: { id: item.id } })}
            className="gap-3 rounded-xl border border-hub-border bg-hub-row p-5 active:opacity-80"
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-lg border border-hub-border bg-hub-muted">
                <Folder color={item.is_owner ? colors.accent : colors.info} size={21} />
              </View>
              <StatusPill
                label={formatAccessType(item.access_type)}
                tone={item.is_owner ? 'success' : item.access_type === 'permanent' ? 'info' : 'warning'}
              />
            </View>
            <View className="gap-1">
              <Text className="text-lg font-extrabold text-hub-text">{item.title}</Text>
              {item.description ? (
                <Text className="text-sm leading-5 text-hub-soft">{item.description}</Text>
              ) : null}
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-hub-soft">
                {item.is_owner ? 'Carpeta propia' : `Expira: ${formatDateTime(item.expires_at)}`}
              </Text>
              <RefreshCw color={colors.textMuted} size={15} strokeWidth={2.4} />
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
