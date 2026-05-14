import { useFocusEffect } from 'expo-router';
import { Activity, Clock, MonitorCheck, ShieldOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { PageHeader } from '../../src/components/PageHeader';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { colors } from '../../src/constants/theme';
import {
  getAccessSessionState,
  listOwnedAccessSessions,
  revokeAccessSession,
} from '../../src/services/accessCodes';
import { getApiErrorMessage } from '../../src/services/apiErrors';
import type { AccessSession } from '../../src/types/domain';
import { formatAccessType, formatDateTime } from '../../src/utils/format';

export default function ManageAccessScreen() {
  const [sessions, setSessions] = useState<AccessSession[]>([]);

  const load = useCallback(async () => {
    try {
      setSessions(await listOwnedAccessSessions());
    } catch (error) {
      Alert.alert('No se pudieron cargar los accesos', await getApiErrorMessage(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function revoke(id: string) {
    try {
      await revokeAccessSession(id);
      await load();
    } catch (error) {
      Alert.alert('No se pudo revocar el acceso', await getApiErrorMessage(error));
    }
  }

  return (
    <Screen scroll={false}>
      <PageHeader
        eyebrow="Propietario"
        icon={MonitorCheck}
        title="Gestionar accesos"
        meta="Los accesos revocados dejan de autorizar Storage, media y claves envueltas."
      />

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="Sin accesos"
            body="Cuando alguien valide un código de tus carpetas, aparecerá aquí."
          />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const state = getAccessSessionState(item);

          return (
            <View className="gap-3 rounded-xl border border-hub-border bg-hub-row p-5">
              <View className="flex-row items-center justify-between">
                <StatusPill
                  label={state}
                  tone={state === 'active' ? 'success' : state === 'revoked' ? 'danger' : 'warning'}
                />
                <Activity color={colors.textMuted} size={17} strokeWidth={2.4} />
              </View>
              <Text className="text-base font-extrabold text-hub-text">
                {formatAccessType(item.access_type)}
              </Text>
              <View className="flex-row items-center gap-2">
                <Clock color={colors.textMuted} size={15} strokeWidth={2.4} />
                <Text className="text-[13px] text-hub-soft">
                  {formatDateTime(item.expires_at)}
                </Text>
              </View>
              {state === 'active' ? (
                <Button icon={ShieldOff} variant="danger" onPress={() => revoke(item.id)}>
                  Revocar acceso
                </Button>
              ) : null}
            </View>
          );
        }}
      />
    </Screen>
  );
}
