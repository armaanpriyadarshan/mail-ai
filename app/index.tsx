import { Redirect } from "expo-router";

// Routes through the AuthGate which redirects to (auth) or (app) appropriately.
export default function Index() {
  return <Redirect href="/(app)" />;
}
