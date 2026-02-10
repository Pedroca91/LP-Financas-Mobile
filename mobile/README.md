# LP Finanças - App Mobile

App mobile para gerenciamento de finanças pessoais, desenvolvido com Expo/React Native.

## 📱 Funcionalidades

- **Dashboard**: Resumo financeiro com gráficos
- **Receitas**: Gerenciamento de entradas
- **Despesas**: Gerenciamento de saídas com suporte a parcelas
- **Modo Escuro**: Suporte a tema claro/escuro
- **Autenticação**: Login seguro com JWT

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app no seu celular (para testes)

### Instalação

```bash
cd /app/mobile
npm install
```

### Executar no Emulador/Celular

```bash
# Iniciar o servidor de desenvolvimento
npx expo start

# Ou com tunnel (para acessar de qualquer rede)
npx expo start --tunnel
```

Depois, escaneie o QR Code com o app **Expo Go** no seu celular.

### Executar na Web (para testes rápidos)

```bash
npx expo start --web
```

## 📦 Publicar nas Lojas

### 1. Criar conta no Expo (EAS)

```bash
npx expo login
```

### 2. Configurar EAS Build

```bash
npx eas-cli build:configure
```

### 3. Build para Android (APK/AAB)

```bash
# Build de desenvolvimento (APK)
npx eas-cli build --platform android --profile preview

# Build de produção (AAB para Google Play)
npx eas-cli build --platform android --profile production
```

### 4. Build para iOS

```bash
# Requer conta Apple Developer ($99/ano)
npx eas-cli build --platform ios --profile production
```

### 5. Submeter às Lojas

```bash
# Android (Google Play)
npx eas-cli submit --platform android

# iOS (App Store)
npx eas-cli submit --platform ios
```

## 🔧 Configuração do Backend

O app se conecta ao backend em:
```
https://mobile-migration-11.preview.emergentagent.com/api
```

Para mudar a URL do backend, edite o arquivo:
`src/services/api.js`

## 📂 Estrutura do Projeto

```
mobile/
├── App.js                 # Ponto de entrada
├── app.json              # Configurações do Expo
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── contexts/         # Context API (Auth, Theme, Finance)
│   ├── navigation/       # Configuração de navegação
│   ├── screens/          # Telas do app
│   ├── services/         # Serviços de API
│   ├── theme/            # Cores e estilos
│   └── utils/            # Funções utilitárias
└── assets/               # Ícones e imagens
```

## 🎨 Personalização

### Cores
Edite `src/theme/colors.js` para personalizar as cores.

### Ícone do App
Substitua os arquivos em `assets/`:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash-icon.png` (1284x2778)

## 📋 Requisitos para Publicação

### Google Play Store
- Conta de desenvolvedor: $25 (pagamento único)
- Arquivo AAB gerado pelo EAS Build
- Screenshots, descrição, política de privacidade

### Apple App Store
- Conta Apple Developer: $99/ano
- Mac para build iOS (ou usar EAS Build)
- Screenshots, descrição, política de privacidade

## 🐛 Solução de Problemas

### Erro de Conexão
Verifique se a URL do backend está correta em `src/services/api.js`

### App não abre
```bash
npx expo start --clear
```

### Build falhou
```bash
npx eas-cli build --platform android --clear-cache
```

## 👨‍💻 Desenvolvido por

**Pedro Carvalho**

---

LP Finanças © 2025
