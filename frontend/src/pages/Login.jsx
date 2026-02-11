import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../components/ui/toast-provider';
import { Wallet, LogIn, TrendingUp, DollarSign, PieChart, ArrowRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Elementos decorativos flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Moedas flutuantes - Modo Claro */}
        <div className="absolute top-20 left-[10%] w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 dark:from-yellow-500 dark:to-amber-600 dark:opacity-30 animate-float" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-[15%] w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-15 dark:from-yellow-500 dark:to-amber-600 dark:opacity-25 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-[20%] w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-25 dark:from-yellow-500 dark:to-amber-600 dark:opacity-35 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-[60%] right-[25%] w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 dark:from-yellow-500 dark:to-amber-600 dark:opacity-30 animate-float" style={{animationDelay: '1.5s'}}></div>
        
        {/* Moedas menores */}
        <div className="absolute top-[30%] left-[30%] w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 opacity-30 dark:from-slate-600 dark:to-slate-700 dark:opacity-40 animate-float-slow" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-[20%] right-[35%] w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 opacity-25 dark:from-slate-600 dark:to-slate-700 dark:opacity-35 animate-float-slow" style={{animationDelay: '2.5s'}}></div>
        
        {/* Gráficos decorativos */}
        <div className="absolute bottom-0 left-0 w-64 h-48 opacity-10 dark:opacity-20">
          <svg viewBox="0 0 200 150" className="w-full h-full">
            <path d="M 0 120 Q 50 80 100 100 T 200 60" stroke="#06b6d4" strokeWidth="3" fill="none" opacity="0.5" className="dark:stroke-cyan-400"/>
            <path d="M 0 140 L 40 110 L 80 120 L 120 90 L 160 100 L 200 70" stroke="#14b8a6" strokeWidth="2" fill="none" opacity="0.6" className="dark:stroke-teal-400"/>
          </svg>
        </div>
        
        <div className="absolute top-0 right-0 w-72 h-56 opacity-10 dark:opacity-20">
          <svg viewBox="0 0 200 150" className="w-full h-full">
            <path d="M 0 80 Q 50 60 100 70 T 200 40" stroke="#0891b2" strokeWidth="3" fill="none" opacity="0.5" className="dark:stroke-cyan-400"/>
            <path d="M 0 100 L 40 80 L 80 85 L 120 65 L 160 70 L 200 50" stroke="#14b8a6" strokeWidth="2" fill="none" opacity="0.6" className="dark:stroke-teal-400"/>
          </svg>
        </div>

        {/* Efeito de brilho no modo escuro */}
        <div className="hidden dark:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Container principal */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Card de Login */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl dark:shadow-cyan-500/10 overflow-hidden transform transition-all hover:scale-[1.01] duration-300 border border-transparent dark:border-slate-700">
            {/* Header com logo */}
            <div className="p-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 dark:from-cyan-400 dark:to-teal-500 mb-4 shadow-lg dark:shadow-cyan-500/30">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400 bg-clip-text text-transparent mb-2">
                LP Finanças
              </h1>
            </div>

            {/* Formulário */}
            <div className="px-8 pb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Entrar</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Digite suas credenciais</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Campo E-mail */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="h-12 px-4 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Campo Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 px-4 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Botão de Login */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 dark:from-cyan-400 dark:to-teal-500 dark:hover:from-cyan-500 dark:hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl dark:shadow-cyan-500/20 dark:hover:shadow-cyan-500/30 transform transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                {/* Divisor */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-slate-600"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-gray-400 dark:text-gray-500">ou continue com</span>
                  </div>
                </div>

                {/* Botão Login com Google */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </Button>

                {/* Link de cadastro */}
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Não tem uma conta?{' '}
                    <Link 
                      to="/register" 
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold hover:underline transition-colors"
                    >
                      Cadastre-se
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Desenvolvido por - Canto inferior esquerdo */}
      <div className="fixed bottom-6 left-6 z-20">
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md dark:shadow-cyan-500/10 border border-gray-200 dark:border-slate-700">
          <span className="text-cyan-600 dark:text-cyan-400">💻</span>
          Desenvolvido por <span className="font-semibold text-cyan-700 dark:text-cyan-400">Pedro Carvalho</span>
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-40px) rotate(-5deg);
          }
          75% {
            transform: translateY(-20px) rotate(3deg);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-30px) translateX(10px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
