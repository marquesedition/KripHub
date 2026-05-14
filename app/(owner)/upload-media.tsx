import { useFocusEffect } from 'expo-router';
import { Check, FileVideo, ImageIcon, LockKeyhole, UploadCloud } from 'lucide-react-native';
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
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { listOwnerCollections, pickMediaDocument, uploadEncryptedMedia } from '../../src/services/media';
import type { Collection, MediaType } from '../../src/types/domain';
import { formatBytes } from '../../src/utils/format';

type PickedMedia = {
  localUri: string;
  name: string;
  size: number;
  type: MediaType;
};

export default function UploadMediaScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      const nextCollections = await listOwnerCollections();
      setCollections(nextCollections);
      setCollectionId((current) => current ?? nextCollections[0]?.id ?? null);
    } catch (error) {
      Alert.alert('No se pudieron cargar las carpetas', await getApiErrorMessage(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [loadCollections]),
  );

  async function chooseFile() {
    const nextPicked = await pickMediaDocument();

    if (!nextPicked) {
      return;
    }

    setPicked(nextPicked);
    setTitle(nextPicked.name.replace(/\.[^.]+$/, ''));
  }

  async function upload() {
    if (!picked || !collectionId) {
      return;
    }

    setLoading(true);

    try {
      await uploadEncryptedMedia({
        collectionId,
        localUri: picked.localUri,
        title,
        type: picked.type,
      });
      setPicked(null);
      setTitle('');
      Alert.alert('Subida cifrada completada', 'Supabase Storage solo recibió bytes cifrados.');
    } catch (error) {
      Alert.alert('No se pudo subir el contenido', await getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Propietario"
        icon={UploadCloud}
        title="Subir contenido"
        meta="El archivo se cifra con AES-GCM antes de subirlo al bucket privado."
      />

      <Surface className="gap-4">
        <Text className="text-lg font-extrabold text-hub-text">Carpeta destino</Text>
        <FlatList
          horizontal
          data={collections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="Crea una carpeta primero"
              body="La subida necesita una carpeta destino."
            />
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
      </Surface>

      <Surface className="gap-4">
        <TextField label="Título" onChangeText={setTitle} value={title} />
        <Button icon={ImageIcon} variant="secondary" onPress={chooseFile}>
          Seleccionar imagen o vídeo
        </Button>
        {picked ? (
          <View className="flex-row items-center gap-3 rounded-lg border border-hub-border bg-hub-row p-4">
            <View className="h-11 w-11 items-center justify-center rounded-lg border border-hub-border bg-hub-muted">
              {picked.type === 'video' ? (
                <FileVideo color={colors.info} size={20} strokeWidth={2.4} />
              ) : (
                <ImageIcon color={colors.accent} size={20} strokeWidth={2.4} />
              )}
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-bold text-hub-text">{picked.name}</Text>
              <Text className="text-hub-soft">{formatBytes(picked.size)}</Text>
            </View>
            <StatusPill label={picked.type} tone={picked.type === 'video' ? 'info' : 'success'} />
          </View>
        ) : null}
        <Button
          disabled={!picked || !title || !collectionId}
          icon={LockKeyhole}
          loading={loading}
          onPress={upload}
        >
          Cifrar y subir
        </Button>
      </Surface>
    </Screen>
  );
}
