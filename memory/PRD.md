# CarFinanças - PRD (Product Requirements Document)

## Histórico de Correções
- **05/01/2026**: Corrigido erro de Toaster duplicado que causava crash no DOM

## Problema Original
Sistema completo de gerenciamento financeiro chamado CarFinanças, baseado em planilhas financeiras organizadas por abas. Sistema web responsivo com Dashboard, Registros (Entradas e Saídas), Investimentos, Relatórios e Configurações. Sistema de usuários com aprovação de admin. Modo claro e escuro.

## Data de Criação
05/01/2026

## Stack Tecnológica
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Autenticação**: JWT com aprovação de admin

## User Personas
1. **Administrador**: Acesso total, aprova/bloqueia usuários, visualiza todos os dados
2. **Usuário Comum**: Visualiza apenas seus próprios dados, gerencia suas finanças pessoais

## Credenciais do Admin
- **Email**: Pedrohcarvalho1997@gmail.com
- **Senha**: S@muka91

---

## O que foi implementado ✅

### Autenticação e Usuários
- [x] Login com email e senha (JWT)
- [x] Registro de novos usuários (aguardando aprovação)
- [x] Admin padrão criado automaticamente
- [x] Aprovação/bloqueio de usuários pelo admin
- [x] Isolamento de dados por usuário

### Dashboard
- [x] Cards de resumo: Saldo, Receitas, Despesas, Investimentos
- [x] Gráfico de evolução anual (Receitas vs Despesas)
- [x] Gráfico Meta vs Realizado
- [x] Seletor de mês/ano

### Módulo de Entradas (Receitas)
- [x] Tabela com lançamentos de receitas
- [x] CRUD completo (criar, editar, excluir)
- [x] Categorização de receitas
- [x] Status: Pendente/Recebido
- [x] Totais automáticos

### Módulo de Saídas (Despesas)
- [x] Tabela com lançamentos de despesas
- [x] CRUD completo
- [x] Categorização de despesas
- [x] Forma de pagamento (Dinheiro, Débito, Crédito)
- [x] Suporte a cartão de crédito com parcelas
- [x] Status: Pendente/Pago
- [x] Totais automáticos

### Módulo de Investimentos
- [x] Tabela por investimento/período
- [x] Saldo inicial, aportes, dividendos, retiradas
- [x] Cálculo automático de saldo final
- [x] CRUD completo

### Módulo de Relatórios
- [x] Gráfico de pizza por categoria (Receitas)
- [x] Gráfico de pizza por categoria (Despesas)
- [x] Comparativo Meta vs Realizado por categoria
- [x] Detalhamento com percentuais

### Módulo de Ajustes
- [x] Gerenciamento de categorias (Receitas, Despesas, Investimentos)
- [x] Categorias padrão criadas automaticamente
- [x] Gerenciamento de cartões de crédito

### Painel Admin
- [x] Lista de todos os usuários
- [x] Aprovar/bloquear usuários
- [x] Excluir usuários e seus dados
- [x] Contadores de status

### UX/UI
- [x] Modo claro e modo escuro
- [x] Design moderno com tons teal e laranja
- [x] Interface responsiva
- [x] Navegação por abas no topo
- [x] Toasts de feedback
- [x] Tabelas editáveis

---

## Backlog - Funcionalidades Futuras

### P0 (Prioridade Alta)
- [ ] Exportação de dados (PDF/Excel)
- [ ] Metas de orçamento por categoria

### P1 (Prioridade Média)
- [ ] Notificações de contas a vencer
- [ ] Gráficos comparativos entre meses
- [ ] Importação de dados (CSV/planilha)

### P2 (Prioridade Baixa)
- [ ] Recorrência automática de lançamentos
- [ ] Dashboard com mais indicadores
- [ ] Filtros avançados nas tabelas
- [ ] Anexar comprovantes

---

## Próximos Passos
1. Adicionar dados de exemplo para demonstração
2. Implementar exportação de relatórios
3. Criar metas de orçamento por categoria
4. Adicionar notificações de vencimento
