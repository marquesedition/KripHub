import { router } from 'expo-router';
import { signOut } from './auth';
import { clearExpiredAccessIfNeeded, clearKripHubSecureMaterial } from './secureCache';

export async function clearExpiredLocalAccess() {
  return clearExpiredAccessIfNeeded();
}

export async function signOutAndClearVault() {
  await clearKripHubSecureMaterial();
  await signOut();
  router.replace('/login');
}
