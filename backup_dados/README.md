# 📦 BACKUP E DOCUMENTAÇÃO DO SISTEMA

## 📍 Localização dos Arquivos

Todos os backups e documentações estão salvos em:
```
/app/backup_dados/
```

## 📄 Arquivos Disponíveis

### Backup Mais Recente
- **Backup JSON**: `backup_completo_20260128_154115.json`
- **Documentação**: `documentacao_20260128_154115.md`

## 📊 O que está incluído

### Backup JSON
Contém TODOS os dados do sistema em formato JSON:
- ✅ Usuários
- ✅ Categorias (20 categorias)
- ✅ Receitas/Entradas (Janeiro 2026)
- ✅ Despesas/Saídas (Janeiro 2026)
- ✅ Investimentos
- ✅ Cartões de Crédito
- ✅ Orçamentos
- ✅ Benefícios (VR/VA)
- ✅ Transações Recorrentes

### Documentação MD
Documentação completa em Markdown com:
- 📊 Visão geral do sistema
- 👥 Lista de usuários
- 📁 Categorias organizadas por tipo
- 💰 Receitas detalhadas (Janeiro 2026)
- 💸 Despesas detalhadas (Janeiro 2026)
- 💳 Cartões de crédito cadastrados
- 📊 Orçamentos configurados
- 📈 Análise financeira com gráficos
- 🗄️ Estrutura de dados do MongoDB

## 🔄 Como Gerar Novo Backup

Execute o script:
```bash
cd /app
python backup_dados_completo.py
```

Isso irá criar:
- Novo arquivo JSON com timestamp
- Nova documentação MD com timestamp

## 📖 Como Visualizar a Documentação

### Via Terminal
```bash
cat /app/backup_dados/documentacao_20260128_154115.md
```

### Via Navegador (Markdown)
Abra o arquivo em qualquer editor que suporte Markdown ou copie o conteúdo para um visualizador online.

## 💾 Como Restaurar os Dados

Para restaurar os dados de um backup:

1. Identifique o arquivo de backup desejado
2. Use o script de restauração (se disponível) ou importe manualmente no MongoDB

```bash
# Exemplo de importação manual
mongoimport --db test_database --collection [nome_da_collection] --file backup_completo_20260128_154115.json
```

## 📋 Resumo dos Dados Atuais

### Janeiro 2026
- **Receitas Recebidas**: R$ 9.014,78
- **Receitas Pendentes**: R$ 1.200,00
- **Despesas Pagas**: R$ 8.415,20
- **Despesas Pendentes**: R$ 553,60
- **Saldo do Mês**: R$ 599,58

### Estatísticas
- **Total de Categorias**: 20
- **Total de Receitas**: 6 lançamentos
- **Total de Despesas**: 14 lançamentos
- **Total de Usuários**: 1

## 🔐 Segurança

- ⚠️ Os backups contêm dados sensíveis
- ⚠️ Senhas são armazenadas em hash bcrypt
- ⚠️ Não compartilhe os arquivos de backup publicamente

## 📞 Informações Adicionais

**Sistema**: CarFinanças v2.0  
**Banco de Dados**: MongoDB (test_database)  
**URL**: https://mobile-migration-11.preview.emergentagent.com  
**Última Atualização**: 28/01/2026 às 15:41
