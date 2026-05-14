import { router } from 'expo-router';
import { FolderPlus, KeyRound, LogOut, MonitorCheck, UploadCloud, UserCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { PageHeader } from '../../src/components/PageHeader';
import { QuickAction } from '../../src/components/QuickAction';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { useAuth } from '../../src/contexts/AuthContext';
import { signOutAndClearVault } from '../../src/services/session';

export default function ProfileScreen() {
  const { profile } = useAuth();

  return (
    <Screen>
      <PageHeader
        eyebrow="Perfil"
        icon={UserCircle}
        title={profile?.nickname ?? 'KripHub'}
        meta="Puedes recibir carpetas por código y también compartir tus propias colecciones."
      />

      <Surface className="gap-2">
        <Text className="text-xs font-extrabold uppercase text-hub-soft">Identidad visible</Text>
        <Text className="text-xl font-extrabold text-hub-text">
          {profile?.nickname ?? 'Sin nickname'}
        </Text>
        <Text className="text-sm leading-5 text-hub-soft">
          La app no muestra emails públicamente. La autorización se decide por sesión y RLS.
        </Text>
      </Surface>

      <View className="gap-3">
        <QuickAction
          body="Crea una carpeta privada para tus imágenes y vídeos cifrados."
          icon={FolderPlus}
          onPress={() => router.push('/create-folder')}
          title="Crear carpeta"
          tone="green"
        />
        <QuickAction
          body="Selecciona un archivo, cífralo localmente y sube solo bytes cifrados."
          icon={UploadCloud}
          onPress={() => router.push('/upload-media')}
          title="Subir contenido"
          tone="blue"
        />
        <QuickAction
          body="Comparte una carpeta con acceso temporal o definitivo."
          icon={KeyRound}
          onPress={() => router.push('/generate-code')}
          title="Generar código"
          tone="amber"
        />
        <QuickAction
          body="Revisa accesos activos, expirados y revocados."
          icon={MonitorCheck}
          onPress={() => router.push('/manage-access')}
          title="Gestionar accesos"
          tone="violet"
        />
      </View>

      <Button icon={LogOut} variant="danger" onPress={signOutAndClearVault}>
        Cerrar sesión y limpiar claves
      </Button>
    </Screen>
  );
}
