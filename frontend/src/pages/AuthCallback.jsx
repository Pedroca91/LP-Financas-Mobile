import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../components/ui/toast-provider';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processGoogleAuth = async () => {
      try {
        // Get session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Erro de autenticação: sessão não encontrada');
          navigate('/login');
          return;
        }

        // Call backend to process Google auth
        const response = await axios.post(`${API}/auth/google/session`, {
          session_id: sessionId
        });

        const { token, user } = response.data;

        // Store token
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        toast.success(`Bem-vindo, ${user.name}!`);
        
        // Navigate to dashboard with user data
        navigate('/', { state: { user }, replace: true });

      } catch (error) {
        console.error('Google auth error:', error);
        const message = error.response?.data?.detail || 'Erro ao autenticar com Google';
        toast.error(message);
        navigate('/login');
      }
    };

    processGoogleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg text-gray-600 dark:text-gray-300">Processando autenticação...</p>
      </div>
    </div>
  );
}
