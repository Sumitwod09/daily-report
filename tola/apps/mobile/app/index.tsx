import { Redirect } from 'expo-router';
import { getDb } from '../src/db/database';
import { FirmQ } from '../src/db/queries';

export default function Index() {
  const db = getDb();
  const firm = db.getFirstSync(FirmQ.get);
  return firm
    ? <Redirect href="/(tabs)/dashboard" />
    : <Redirect href="/onboarding" />;
}
