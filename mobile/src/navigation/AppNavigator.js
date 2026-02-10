import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import IncomesScreen from '../screens/IncomesScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import CardsScreen from '../screens/CardsScreen';
import BenefitsScreen from '../screens/BenefitsScreen';
import RecurringScreen from '../screens/RecurringScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminScreen from '../screens/AdminScreen';
import MoreScreen from '../screens/MoreScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Receitas':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Despesas':
              iconName = focused ? 'trending-down' : 'trending-down-outline';
              break;
            case 'Cartões':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Mais':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Receitas"
        component={IncomesScreen}
        options={{ tabBarLabel: 'Receitas' }}
      />
      <Tab.Screen
        name="Despesas"
        component={ExpensesScreen}
        options={{ tabBarLabel: 'Despesas' }}
      />
      <Tab.Screen
        name="Cartões"
        component={CardsScreen}
        options={{ tabBarLabel: 'Cartões' }}
      />
      <Tab.Screen
        name="Mais"
        component={MoreStackNavigator}
        options={{ tabBarLabel: 'Mais' }}
      />
    </Tab.Navigator>
  );
}

function MoreStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <Stack.Screen name="Investimentos" component={InvestmentsScreen} />
      <Stack.Screen name="Beneficios" component={BenefitsScreen} />
      <Stack.Screen name="Recorrentes" component={RecurringScreen} />
      <Stack.Screen name="Relatorios" component={ReportsScreen} />
      <Stack.Screen name="Categorias" component={SettingsScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="Perfil" component={MoreScreen} />
    </Stack.Navigator>
  );
}

function MoreMenuScreen({ navigation }) {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();
  
  const menuItems = [
    { id: 'Investimentos', label: 'Investimentos', icon: 'bar-chart', color: colors.investment },
    { id: 'Beneficios', label: 'VR/VA', icon: 'card', color: colors.warning },
    { id: 'Recorrentes', label: 'Recorrentes', icon: 'repeat', color: colors.primary },
    { id: 'Relatorios', label: 'Relatórios', icon: 'pie-chart', color: colors.secondary },
    { id: 'Categorias', label: 'Categorias', icon: 'folder', color: colors.textSecondary },
    { id: 'Perfil', label: 'Perfil', icon: 'person', color: colors.text },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'Admin', label: 'Administração', icon: 'shield-checkmark', color: colors.expense });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.surface }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>Mais</Text>
      </View>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                width: '47%',
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
              }}
              onPress={() => navigation.navigate(item.id)}
            >
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: `${item.color}20`,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return null;
  }

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900',
      },
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
