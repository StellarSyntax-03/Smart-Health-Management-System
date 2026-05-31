import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/auth";
import RootNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
