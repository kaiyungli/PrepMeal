/**
 * Entry route. The app opens straight onto the tab bar; `今日` (today) is the
 * default daily-use surface.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/today" />;
}
