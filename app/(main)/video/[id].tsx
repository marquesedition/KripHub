import { useLocalSearchParams, useNavigation } from 'expo-router';
import { LockKeyhole, Video } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
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

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [media, setMedia] = useState<Media | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const player = useVideoPlayer(localUri ? { uri: localUri } : null, (instance) => {
    instance.loop = false;
  });

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
        Alert.alert('No se pudo abrir el vídeo', await getApiErrorMessage(error));
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
          eyebrow="Reproductor"
          icon={Video}
          title={media?.title ?? 'Vídeo'}
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
          <Text className="text-hub-soft">Descifrando vídeo...</Text>
        </View>
      ) : null}

      {!loading && localUri ? (
        <VideoView allowsFullscreen contentFit="contain" player={player} className="flex-1 w-full rounded-lg bg-hub-panel" />
      ) : null}
    </Screen>
  );
}
