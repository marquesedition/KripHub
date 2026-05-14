import { router, useFocusEffect } from 'expo-router';
import { FolderPlus, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { PageHeader } from '../../src/components/PageHeader';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { TextField } from '../../src/components/TextField';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { createCollection, listOwnerCollections } from '../../src/services/media';
import type { Collection } from '../../src/types/domain';

export default function CreateFolderScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setCollections(await listOwnerCollections());
    } catch (error) {
      Alert.alert('No se pudieron cargar las carpetas', await getApiErrorMessage(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    setLoading(true);

    try {
      await createCollection(title, description);
      setTitle('');
      setDescription('');
      await load();
    } catch (error) {
      Alert.alert('No se pudo crear la carpeta', await getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <PageHeader
        eyebrow="Propietario"
        icon={FolderPlus}
        title="Crear carpeta"
        meta={`${collections.length} carpeta${collections.length === 1 ? '' : 's'} propia${
          collections.length === 1 ? '' : 's'
        }`}
      />

      <Surface className="gap-4">
        <TextField label="Título" onChangeText={setTitle} value={title} />
        <TextField label="Descripción" onChangeText={setDescription} value={description} />
        <Button disabled={!title} icon={Plus} loading={loading} onPress={submit}>
          Crear carpeta
        </Button>
        <Button icon={Plus} onPress={() => router.push('/upload-media')} variant="secondary">
          Ir a subir contenido
        </Button>
      </Surface>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="Sin carpetas"
            body="Crea una carpeta antes de subir contenido cifrado."
          />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3 rounded-xl border border-hub-border bg-hub-row p-5">
            <View className="h-11 w-11 items-center justify-center rounded-lg border border-hub-border bg-hub-muted">
              <FolderPlus color="#4dabf7" size={19} strokeWidth={2.4} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-base font-bold text-hub-text">{item.title}</Text>
              {item.description ? (
                <Text className="text-[13px] text-hub-soft">{item.description}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
