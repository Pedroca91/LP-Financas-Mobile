import { useState } from 'react';
import { LoginDarkMode } from './LoginDarkMode';

export function LoginPreview() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controles no topo */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Preview da Tela de Login</span>
        <button
          onClick={() => setIsDark(!isDark)}
          className="px-4 py-2 rounded-full font-medium text-sm transition-all"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#06b6d4',
            color: 'white'
          }}
        >
          {isDark ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
        </button>
      </div>

      {/* Preview da tela */}
      <div className={isDark ? 'dark' : ''}>
        <LoginDarkMode />
      </div>
    </div>
  );
}
