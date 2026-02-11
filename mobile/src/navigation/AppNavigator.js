import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
import GoalsScreen from '../screens/GoalsScreen';
import ChatScreen from '../screens/ChatScreen';
import ImportScreen from '../screens/ImportScreen';

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
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.tabBarInactive || colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground || colors.primary,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
      <Stack.Screen name="Metas" component={GoalsScreen} />
      <Stack.Screen name="Assistente" component={ChatScreen} />
      <Stack.Screen name="Importar" component={ImportScreen} />
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
    { id: 'Metas', label: 'Metas', icon: 'flag', color: colors.gold },
    { id: 'Assistente', label: 'Assistente IA', icon: 'chatbubbles', color: '#8b5cf6' },
    { id: 'Importar', label: 'Importar Extrato', icon: 'cloud-upload', color: '#06b6d4' },
    { id: 'Investimentos', label: 'Investimentos', icon: 'bar-chart', color: colors.investment },
    { id: 'Beneficios', label: 'VR/VA', icon: 'card', color: '#f59e0b' },
    { id: 'Recorrentes', label: 'Recorrentes', icon: 'repeat', color: '#10b981' },
    { id: 'Relatorios', label: 'Relatórios', icon: 'pie-chart', color: '#ec4899' },
    { id: 'Categorias', label: 'Categorias', icon: 'folder', color: '#6366f1' },
    { id: 'Perfil', label: 'Perfil', icon: 'person', color: '#64748b' },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'Admin', label: 'Administração', icon: 'shield-checkmark', color: colors.expense });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ 
        paddingHorizontal: 20, 
        paddingTop: 60, 
        paddingBottom: 16, 
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.textLight }}>Mais</Text>
        <Text style={{ fontSize: 14, color: colors.textLight, opacity: 0.8, marginTop: 4 }}>
          Acesse todas as funcionalidades
        </Text>
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
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 3,
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
                borderWidth: 1,
                borderColor: `${item.color}40`,
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

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return null;
  }

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.gold,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.gold,
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
