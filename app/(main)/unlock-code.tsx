import { router } from 'expo-router';
import { KeyRound, Unlock } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '../../src/components/Button';
import { PageHeader } from '../../src/components/PageHeader';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { TextField } from '../../src/components/TextField';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import { validateAccessCode } from '../../src/services/accessCodes';

export default function UnlockCodeScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function unlock() {
    setLoading(true);

    try {
      await validateAccessCode(code);
      router.replace('/gallery');
    } catch (error) {
      Alert.alert('Código no válido', await getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Acceso"
        icon={KeyRound}
        title="Introducir código"
        meta="Si el código es válido, la carpeta aparecerá en tu galería."
      />

      <Surface className="gap-5">
        <TextField
          autoCapitalize="characters"
          label="Código"
          onChangeText={setCode}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={code}
        />
        <Button disabled={!code} icon={Unlock} loading={loading} onPress={unlock}>
          Validar código
        </Button>
      </Surface>
    </Screen>
  );
}
