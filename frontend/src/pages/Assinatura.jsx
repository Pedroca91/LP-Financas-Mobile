import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from '../components/ui/toast-provider';
import {
  CheckCircle2,
  Crown,
  Zap,
  Star,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FEATURES_FREE = [
  'Dashboard financeiro completo',
  'Controle de receitas e despesas',
  'Relatórios básicos',
  'Até 50 lançamentos/mês',
];

const FEATURES_PRO = [
  'Tudo do plano gratuito',
  'Lançamentos ilimitados',
  'Exportação PDF e Excel',
  'Análise avançada e previsões',
  'Cartões de crédito com parcelas',
  'Investimentos e metas',
  'Assistente IA financeiro',
  'Lançamentos recorrentes',
  'Importação de extratos CSV',
  'Benefícios (VR/VA)',
  'Alertas inteligentes',
  'Suporte prioritário',
];

export function Assinatura() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
    // Handle success/cancel from Stripe redirect
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura ativada com sucesso! Bem-vindo ao LP Finanças Pro!');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Pagamento cancelado. Você pode assinar a qualquer momento.');
    }
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await axios.get(`${API}/subscription/status`);
      setSubscription(res.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription({ plan: 'free', status: 'inactive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (plan) => {
    setCheckoutLoading(plan);
    try {
      const res = await axios.post(`${API}/subscription/checkout`, { plan });
      window.location.href = res.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar pagamento. Tente novamente.');
      setCheckoutLoading('');
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await axios.post(`${API}/subscription/portal`);
      window.location.href = res.data.portal_url;
    } catch (error) {
      toast.error('Erro ao acessar portal de assinatura.');
      setPortalLoading(false);
    }
  };

  const isActive = subscription?.status === 'active';
  const isPro = isActive;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading font-bold text-foreground flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 text-yellow-500" />
          Planos LP Finanças
        </h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para controlar suas finanças com total liberdade
        </p>
      </div>

      {/* Status atual */}
      {isPro && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Assinatura Pro Ativa
              </p>
              <p className="text-sm text-muted-foreground">
                Plano {subscription.plan === 'monthly' ? 'Mensal' : 'Anual'}
                {subscription.current_period_end && (
                  <> · Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</>
                )}
                {subscription.cancel_at_period_end && (
                  <span className="text-yellow-600 ml-2">· Cancelamento agendado</span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePortal}
            disabled={portalLoading}
            className="gap-2"
          >
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Gerenciar Assinatura
          </Button>
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plano Gratuito */}
        <Card className={`relative ${!isPro ? 'border-primary ring-2 ring-primary/20' : ''}`}>
          {!isPro && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3">Plano Atual</Badge>
            </div>
          )}
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Gratuito</CardTitle>
            <CardDescription>Para começar a organizar</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">R$ 0</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES_FREE.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Plano Atual
            </Button>
          </CardContent>
        </Card>

        {/* Plano Mensal */}
        <Card className={`relative ${isPro && subscription?.plan === 'monthly' ? 'border-primary ring-2 ring-primary/20' : 'border-yellow-400/50'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-yellow-500 text-white px-3 gap-1">
              <Zap className="h-3 w-3" />
              Popular
            </Badge>
          </div>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Pro Mensal
            </CardTitle>
            <CardDescription>Acesso completo, sem compromisso</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">R$ 29,90</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES_PRO.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPro && subscription?.plan === 'monthly' ? (
              <Button variant="outline" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                Plano Ativo
              </Button>
            ) : (
              <Button
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => handleCheckout('monthly')}
                disabled={!!checkoutLoading}
              >
                {checkoutLoading === 'monthly' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Assinar Agora
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Plano Anual */}
        <Card className={`relative ${isPro && subscription?.plan === 'annual' ? 'border-primary ring-2 ring-primary/20' : 'border-emerald-400/50'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-emerald-600 text-white px-3 gap-1">
              <Star className="h-3 w-3" />
              Melhor Valor
            </Badge>
          </div>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-emerald-500" />
              Pro Anual
            </CardTitle>
            <CardDescription>Economize 73% vs mensal</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">R$ 97,90</span>
              <span className="text-muted-foreground">/ano</span>
            </div>
            <p className="text-sm text-emerald-600 font-medium mt-1">
              Equivale a R$ 8,16/mês
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES_PRO.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPro && subscription?.plan === 'annual' ? (
              <Button variant="outline" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                Plano Ativo
              </Button>
            ) : (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleCheckout('annual')}
                disabled={!!checkoutLoading}
              >
                {checkoutLoading === 'annual' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Assinar Anual
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Garantia */}
      <div className="bg-secondary/50 rounded-lg p-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary font-semibold">
          <AlertCircle className="h-5 w-5" />
          Garantia de 7 dias
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Experimente o LP Finanças Pro por 7 dias. Se não ficar satisfeito, devolvemos 100% do seu dinheiro, sem perguntas.
        </p>
        <p className="text-xs text-muted-foreground">
          Pagamento seguro via Stripe · Cancele quando quiser · Sem fidelidade
        </p>
      </div>
    </div>
  );
}
