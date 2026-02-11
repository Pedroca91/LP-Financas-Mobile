#!/usr/bin/env python3
"""
Script para fazer backup completo de todos os dados do sistema CarFinanças
e gerar documentação detalhada
"""
import os
import json
from pymongo import MongoClient
from datetime import datetime
from pathlib import Path

# Conectar ao MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Criar diretório de backup
backup_dir = Path('/app/backup_dados')
backup_dir.mkdir(exist_ok=True)

timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_file = backup_dir / f'backup_completo_{timestamp}.json'
doc_file = backup_dir / f'documentacao_{timestamp}.md'

print(f"🔄 Iniciando backup completo do sistema...")
print(f"📁 Diretório: {backup_dir}")
print(f"📄 Arquivo de backup: {backup_file.name}")
print(f"📝 Arquivo de documentação: {doc_file.name}")
print()

# Coletar todos os dados
all_data = {}
collections = ['users', 'categories', 'incomes', 'expenses', 'investments', 
               'credit_cards', 'budgets', 'benefit_credits', 'benefit_expenses',
               'recurring_transactions']

for collection_name in collections:
    collection = db[collection_name]
    data = list(collection.find({}, {'_id': 0}))
    all_data[collection_name] = data
    print(f"✅ {collection_name}: {len(data)} registros")

# Salvar backup JSON
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2, default=str)

print(f"\n💾 Backup salvo em: {backup_file}")

# Gerar documentação detalhada
USER_ID = "49abed68-cee9-4755-ac3c-119942e0e2c0"

# Coletar estatísticas
users = list(db.users.find({}, {'_id': 0}))
categories = list(db.categories.find({'user_id': USER_ID}, {'_id': 0}))
incomes_jan = list(db.incomes.find({'user_id': USER_ID, 'month': 1, 'year': 2026}, {'_id': 0}))
expenses_jan = list(db.expenses.find({'user_id': USER_ID, 'month': 1, 'year': 2026}, {'_id': 0}))
credit_cards = list(db.credit_cards.find({'user_id': USER_ID}, {'_id': 0}))
budgets = list(db.budgets.find({'user_id': USER_ID}, {'_id': 0}))

# Calcular totais
total_income_received = sum(i['value'] for i in incomes_jan if i['status'] == 'received')
total_income_pending = sum(i['value'] for i in incomes_jan if i['status'] == 'pending')
total_expense_paid = sum(e['value'] for e in expenses_jan if e['status'] == 'paid')
total_expense_pending = sum(e['value'] for e in expenses_jan if e['status'] == 'pending')
balance = total_income_received - total_expense_paid

# Categorizar categorias
income_categories = [c for c in categories if c['type'] == 'income']
expense_categories = [c for c in categories if c['type'] == 'expense']
investment_categories = [c for c in categories if c['type'] == 'investment']

# Criar mapa de categorias
cat_map = {c['id']: c['name'] for c in categories}

# Gerar documentação Markdown
doc_content = f"""# 📊 DOCUMENTAÇÃO COMPLETA DO SISTEMA CARFINANÇAS

**Data do Backup**: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}  
**Versão**: 2.0  
**Banco de Dados**: {DB_NAME}

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#visão-geral)
2. [Usuários](#usuários)
3. [Categorias](#categorias)
4. [Dados Financeiros - Janeiro 2026](#dados-financeiros)
5. [Receitas (Entradas)](#receitas)
6. [Despesas (Saídas)](#despesas)
7. [Cartões de Crédito](#cartões-de-crédito)
8. [Orçamentos](#orçamentos)
9. [Análise Financeira](#análise-financeira)
10. [Estrutura de Dados](#estrutura-de-dados)

---

## 📌 VISÃO GERAL DO SISTEMA {{#visão-geral}}

### Estatísticas Gerais
- **Total de Usuários**: {len(users)}
- **Total de Categorias**: {len(categories)}
- **Total de Receitas (Jan/2026)**: {len(incomes_jan)}
- **Total de Despesas (Jan/2026)**: {len(expenses_jan)}
- **Total de Cartões de Crédito**: {len(credit_cards)}
- **Total de Orçamentos**: {len(budgets)}

### Resumo Financeiro - Janeiro 2026
| Métrica | Valor |
|---------|-------|
| 💰 Receitas Recebidas | R$ {total_income_received:,.2f} |
| ⏳ Receitas Pendentes | R$ {total_income_pending:,.2f} |
| 💸 Despesas Pagas | R$ {total_expense_paid:,.2f} |
| ⏳ Despesas Pendentes | R$ {total_expense_pending:,.2f} |
| 📊 **Saldo do Mês** | **R$ {balance:,.2f}** |

---

## 👥 USUÁRIOS {{#usuários}}

### Total: {len(users)} usuário(s)

"""

# Adicionar informações de usuários
for user in users:
    doc_content += f"""
#### {user['name']}
- **ID**: `{user['id']}`
- **Email**: {user['email']}
- **Role**: {user['role']}
- **Status**: {user['status']}
- **Criado em**: {user['created_at']}

"""

doc_content += f"""---

## 📁 CATEGORIAS {{#categorias}}

### Total: {len(categories)} categoria(s)

#### Categorias de Receitas ({len(income_categories)})
"""

for cat in income_categories:
    default_badge = "⭐ Padrão" if cat.get('is_default') else ""
    doc_content += f"- **{cat['name']}** {default_badge}\n"

doc_content += f"""
#### Categorias de Despesas ({len(expense_categories)})
"""

for cat in expense_categories:
    default_badge = "⭐ Padrão" if cat.get('is_default') else ""
    doc_content += f"- **{cat['name']}** {default_badge}\n"

doc_content += f"""
#### Categorias de Investimentos ({len(investment_categories)})
"""

for cat in investment_categories:
    default_badge = "⭐ Padrão" if cat.get('is_default') else ""
    doc_content += f"- **{cat['name']}** {default_badge}\n"

doc_content += f"""
---

## 💰 RECEITAS (ENTRADAS) - JANEIRO 2026 {{#receitas}}

### Total: {len(incomes_jan)} lançamento(s)

**Total Previsto**: R$ {total_income_received + total_income_pending:,.2f}  
**Total Recebido**: R$ {total_income_received:,.2f}  
**Total Pendente**: R$ {total_income_pending:,.2f}

### Detalhamento

| # | Categoria | Descrição | Valor | Data Prevista | Data Recebimento | Status |
|---|-----------|-----------|-------|---------------|------------------|--------|
"""

for idx, income in enumerate(incomes_jan, 1):
    category_name = cat_map.get(income['category_id'], 'N/A')
    description = income.get('description', '-') or '-'
    value = f"R$ {income['value']:,.2f}"
    date = income.get('date', '-')
    payment_date = income.get('payment_date', '-') or '-'
    status = '✅ Recebido' if income['status'] == 'received' else '⏳ Pendente'
    
    doc_content += f"| {idx} | {category_name} | {description} | {value} | {date} | {payment_date} | {status} |\n"

doc_content += f"""
---

## 💸 DESPESAS (SAÍDAS) - JANEIRO 2026 {{#despesas}}

### Total: {len(expenses_jan)} lançamento(s)

**Total Previsto**: R$ {total_expense_paid + total_expense_pending:,.2f}  
**Total Pago**: R$ {total_expense_paid:,.2f}  
**Total Pendente**: R$ {total_expense_pending:,.2f}

### Detalhamento

| # | Categoria | Descrição | Valor | Forma Pagto | Vencimento | Data Pagto | Status |
|---|-----------|-----------|-------|-------------|------------|------------|--------|
"""

for idx, expense in enumerate(expenses_jan, 1):
    category_name = cat_map.get(expense['category_id'], 'N/A')
    description = expense.get('description', '-') or '-'
    value = f"R$ {expense['value']:,.2f}"
    payment_method_map = {'cash': 'Dinheiro', 'debit': 'Débito', 'credit': 'Crédito'}
    payment_method = payment_method_map.get(expense['payment_method'], expense['payment_method'])
    due_date = expense.get('due_date', '-') or '-'
    payment_date = expense.get('payment_date', '-') or '-'
    status = '✅ Pago' if expense['status'] == 'paid' else '⏳ Pendente'
    
    doc_content += f"| {idx} | {category_name} | {description} | {value} | {payment_method} | {due_date} | {payment_date} | {status} |\n"

doc_content += f"""
---

## 💳 CARTÕES DE CRÉDITO {{#cartões-de-crédito}}

### Total: {len(credit_cards)} cartão(ões)

"""

if credit_cards:
    for card in credit_cards:
        doc_content += f"""
#### {card['name']}
- **ID**: `{card['id']}`
- **Limite**: R$ {card.get('limit', 0):,.2f}
- **Dia de Fechamento**: {card.get('closing_day', 'N/A')}
- **Dia de Vencimento**: {card.get('due_day', 'N/A')}
- **Bandeira**: {card.get('brand', 'N/A')}

"""
else:
    doc_content += "Nenhum cartão de crédito cadastrado.\n"

doc_content += f"""---

## 📊 ORÇAMENTOS {{#orçamentos}}

### Total: {len(budgets)} orçamento(s)

"""

if budgets:
    doc_content += "| Categoria | Tipo | Mês/Ano | Valor Planejado |\n"
    doc_content += "|-----------|------|---------|----------------|\n"
    
    for budget in budgets:
        category_name = cat_map.get(budget['category_id'], 'N/A')
        budget_type = budget['type']
        month_year = f"{budget['month']:02d}/{budget['year']}"
        planned = f"R$ {budget['planned_value']:,.2f}"
        doc_content += f"| {category_name} | {budget_type} | {month_year} | {planned} |\n"
else:
    doc_content += "Nenhum orçamento cadastrado.\n"

doc_content += f"""
---

## 📈 ANÁLISE FINANCEIRA {{#análise-financeira}}

### Distribuição de Receitas por Categoria

"""

# Agrupar receitas por categoria
income_by_category = {}
for income in incomes_jan:
    if income['status'] == 'received':
        cat_name = cat_map.get(income['category_id'], 'Desconhecida')
        income_by_category[cat_name] = income_by_category.get(cat_name, 0) + income['value']

doc_content += "| Categoria | Total | % do Total |\n"
doc_content += "|-----------|-------|------------|\n"

for cat_name, total in sorted(income_by_category.items(), key=lambda x: x[1], reverse=True):
    percentage = (total / total_income_received * 100) if total_income_received > 0 else 0
    doc_content += f"| {cat_name} | R$ {total:,.2f} | {percentage:.1f}% |\n"

doc_content += f"""
### Distribuição de Despesas por Categoria

"""

# Agrupar despesas por categoria
expense_by_category = {}
for expense in expenses_jan:
    if expense['status'] == 'paid':
        cat_name = cat_map.get(expense['category_id'], 'Desconhecida')
        expense_by_category[cat_name] = expense_by_category.get(cat_name, 0) + expense['value']

doc_content += "| Categoria | Total | % do Total |\n"
doc_content += "|-----------|-------|------------|\n"

for cat_name, total in sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True):
    percentage = (total / total_expense_paid * 100) if total_expense_paid > 0 else 0
    doc_content += f"| {cat_name} | R$ {total:,.2f} | {percentage:.1f}% |\n"

doc_content += f"""
### Análise de Formas de Pagamento

"""

# Agrupar despesas por forma de pagamento
payment_method_totals = {'cash': 0, 'debit': 0, 'credit': 0}
for expense in expenses_jan:
    if expense['status'] == 'paid':
        method = expense['payment_method']
        payment_method_totals[method] = payment_method_totals.get(method, 0) + expense['value']

payment_method_map = {'cash': 'Dinheiro', 'debit': 'Débito', 'credit': 'Crédito'}

doc_content += "| Forma de Pagamento | Total | % do Total |\n"
doc_content += "|--------------------|-------|------------|\n"

for method, name in payment_method_map.items():
    total = payment_method_totals.get(method, 0)
    percentage = (total / total_expense_paid * 100) if total_expense_paid > 0 else 0
    doc_content += f"| {name} | R$ {total:,.2f} | {percentage:.1f}% |\n"

doc_content += f"""
---

## 🗄️ ESTRUTURA DE DADOS {{#estrutura-de-dados}}

### Collections MongoDB

#### 1. users
- Armazena informações dos usuários do sistema
- Campos: id, email, name, password (hash), role, status, created_at

#### 2. categories
- Categorias de receitas, despesas e investimentos
- Campos: id, user_id, name, type, is_default

#### 3. incomes
- Lançamentos de receitas
- Campos: id, user_id, category_id, description, value, date, payment_date, status, month, year, created_at

#### 4. expenses
- Lançamentos de despesas
- Campos: id, user_id, category_id, description, value, date, payment_method, credit_card_id, installments, current_installment, due_date, payment_date, status, month, year, created_at

#### 5. investments
- Controle de investimentos
- Campos: id, user_id, category_id, initial_balance, contribution, dividends, withdrawal, month, year, created_at

#### 6. credit_cards
- Cartões de crédito cadastrados
- Campos: id, user_id, name, limit, closing_day, due_day, brand, created_at

#### 7. budgets
- Orçamentos planejados por categoria
- Campos: id, user_id, category_id, planned_value, type, month, year, created_at

#### 8. benefit_credits / benefit_expenses
- Controle de VR/VA (Vale Refeição e Vale Alimentação)
- Campos: id, user_id, benefit_type, value, description, date, month, year, created_at

#### 9. recurring_transactions
- Transações recorrentes automáticas
- Campos: id, user_id, type, category_id, description, value, frequency, start_date, end_date, is_active, created_at

---

## 📝 INFORMAÇÕES ADICIONAIS

### Credenciais de Acesso
- **URL**: https://keyboard-modal-fix.preview.emergentagent.com
- **Email Admin**: Pedrohcarvalho1997@gmail.com
- **Senha Admin**: (armazenada em hash bcrypt no banco)

### Backup Criado
- **Arquivo JSON**: `{backup_file.name}`
- **Documentação**: `{doc_file.name}`
- **Localização**: `/app/backup_dados/`

### Como Restaurar
Para restaurar os dados deste backup:
```bash
python restore_from_backup.py {backup_file.name}
```

---

**Fim da Documentação**  
*Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}*
"""

# Salvar documentação
with open(doc_file, 'w', encoding='utf-8') as f:
    f.write(doc_content)

print(f"📝 Documentação salva em: {doc_file}")
print()
print("✅ Backup e documentação criados com sucesso!")
print()
print(f"📂 Arquivos criados:")
print(f"   - {backup_file}")
print(f"   - {doc_file}")
