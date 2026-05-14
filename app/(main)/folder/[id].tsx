import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ImageIcon, LockKeyhole, Play, Video } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { EmptyState } from '../../../src/components/EmptyState';
import { PageHeader } from '../../../src/components/PageHeader';
import { Screen } from '../../../src/components/Screen';
import { StatusPill } from '../../../src/components/StatusPill';
import { colors } from '../../../src/constants/theme';
import { getApiErrorMessage } from '../../../src/services/apiErrors';
import { listMediaForCollection } from '../../../src/services/media';
import type { Media } from '../../../src/types/domain';
import { formatBytes } from '../../../src/utils/format';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<Media[]>([]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setItems(await listMediaForCollection(id));
    } catch (error) {
      Alert.alert('Carpeta bloqueada', await getApiErrorMessage(error));
      router.replace('/gallery');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen scroll={false}>
      <PageHeader
        eyebrow="Colección"
        icon={LockKeyhole}
        title="Contenido cifrado"
        meta={`${items.length} archivo${items.length === 1 ? '' : 's'} autorizado${
          items.length === 1 ? '' : 's'
        }`}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="Sin archivos"
            body="Esta carpeta todavía no tiene imágenes o vídeos autorizados."
          />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: item.type === 'image' ? '/image/[id]' : '/video/[id]',
                params: { id: item.id },
              })
            }
            className="gap-3 rounded-xl border border-hub-border bg-hub-row p-5 active:opacity-80"
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-lg border border-hub-border bg-hub-muted">
                {item.type === 'video' ? (
                  <Video color={colors.info} size={21} strokeWidth={2.4} />
                ) : (
                  <ImageIcon color={colors.accent} size={21} strokeWidth={2.4} />
                )}
              </View>
              <StatusPill
                label={item.type === 'video' ? 'Video' : 'Imagen'}
                tone={item.type === 'video' ? 'info' : 'success'}
              />
            </View>
            <Text className="text-lg font-extrabold text-hub-text">{item.title}</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-hub-soft">
                {formatBytes(item.size_bytes)}
              </Text>
              <Play color={colors.textMuted} size={16} strokeWidth={2.4} />
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
