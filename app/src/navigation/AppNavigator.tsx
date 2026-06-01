import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../context/auth";
import { colors } from "../lib/colors";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DoctorRegisterScreen from "../screens/DoctorRegisterScreen";
import PatientDashboardScreen from "../screens/PatientDashboardScreen";
import DoctorDashboardScreen from "../screens/DoctorDashboardScreen";
import PatientDetailScreen from "../screens/PatientDetailScreen";
import { AuthStackParamList, AppStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} initialParams={{ role: "patient" }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { user } = useAuth();
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === "doctor" ? (
        <>
          <AppStack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
          <AppStack.Screen name="PatientDetail" component={PatientDetailScreen} />
        </>
      ) : (
        <AppStack.Screen name="PatientDashboard" component={PatientDashboardScreen} />
      )}
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate[50],
  },
});
