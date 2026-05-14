import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ImageIcon, LockKeyhole } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, View } from 'react-native';
import { PageHeader } from '../../../src/components/PageHeader';
import { Screen } from '../../../src/components/Screen';
import { StatusPill } from '../../../src/components/StatusPill';
import { colors } from '../../../src/constants/theme';
import { getApiErrorMessage } from '../../../src/services/apiErrors';
import {
  deleteLocalDecryptedMedia,
  downloadAndDecryptMedia,
  getMediaById,
} from '../../../src/services/media';
import type { Media } from '../../../src/types/domain';

export default function ImageViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [media, setMedia] = useState<Media | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        return;
      }

      setLoading(true);

      try {
        const nextMedia = await getMediaById(id);
        const nextUri = await downloadAndDecryptMedia(nextMedia);

        if (!mounted) {
          await deleteLocalDecryptedMedia(nextMedia.id, nextMedia.type);
          return;
        }

        setMedia(nextMedia);
        setLocalUri(nextUri);
        navigation.setOptions({ title: nextMedia.title });
      } catch (error) {
        Alert.alert('No se pudo abrir la imagen', await getApiErrorMessage(error));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id, navigation]);

  useEffect(() => {
    return () => {
      if (media) {
        deleteLocalDecryptedMedia(media.id, media.type).catch(() => undefined);
      }
    };
  }, [media]);

  return (
    <Screen scroll={false}>
      <View className="gap-3">
        <PageHeader
          eyebrow="Visor"
          icon={ImageIcon}
          title={media?.title ?? 'Imagen'}
          meta="Archivo descifrado localmente."
        />
        <StatusPill label="Local" tone="success" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-lg border border-hub-accent bg-hub-muted">
            <LockKeyhole color={colors.accent} size={28} strokeWidth={2.4} />
          </View>
          <ActivityIndicator color={colors.accent} />
          <Text className="text-hub-soft">Descifrando imagen...</Text>
        </View>
      ) : null}

      {!loading && localUri ? (
        <Image
          resizeMode="contain"
          source={{ uri: localUri }}
          className="flex-1 w-full rounded-lg bg-hub-panel"
        />
      ) : null}
    </Screen>
  );
}
