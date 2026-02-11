import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { authService } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const refreshInterval = useRef(null);

  // Verificar autenticação quando o app volta ao foco
  const checkAuthOnFocus = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken && user) {
        // Verifica se o token ainda é válido
        try {
          const response = await authService.getMe();
          setUser(response.data);
        } catch (error) {
          // Token expirado, mas não desloga automaticamente
          // Apenas atualiza os dados se der erro 401
          if (error.response?.status === 401) {
            console.log('Session expired, please login again');
            // Opcional: você pode manter o usuário logado e mostrar um modal
            // await logout();
          }
        }
      }
    } catch (error) {
      console.log('Error checking auth on focus:', error);
    }
  }, [user]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Listener para quando o app volta do background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App voltou ao foco - verificar autenticação
        checkAuthOnFocus();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [checkAuthOnFocus]);

  // Verificar token periodicamente (a cada 5 minutos)
  useEffect(() => {
    if (user && token) {
      refreshInterval.current = setInterval(() => {
        refreshUserData();
      }, 5 * 60 * 1000); // 5 minutos
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [user, token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken) {
        setToken(storedToken);
        
        // Carregar usuário salvo localmente primeiro (para UX mais rápida)
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            // JSON inválido
          }
        }
        
        // Depois verificar com o servidor
        try {
          const response = await authService.getMe();
          setUser(response.data);
          // Salvar usuário atualizado
          await AsyncStorage.setItem('user', JSON.stringify(response.data));
        } catch (authError) {
          if (authError.response?.status === 401) {
            // Token realmente expirado - fazer logout
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
          // Para outros erros (rede, servidor), mantém o usuário logado com dados locais
        }
      }
    } catch (error) {
      console.log('Auth check completed with error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      // Silenciosamente ignora erros de refresh
      // Só desloga se for erro 401
      if (error.response?.status === 401) {
        console.log('Token expired during refresh');
      }
    }
  };

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    const { token: newToken, user: userData } = response.data;
    
    // Salvar token e usuário
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await authService.register(name, email, password);
    return response.data;
  };

  const logout = async () => {
    // Limpar intervalo de refresh
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout, 
      isAdmin,
      refreshUserData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
