// src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import IdleTimer from '@/components/IdleTimer';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'NWS Plataforma',
  description: 'Plataforma de Coleta Inteligente de Dados',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <AuthProvider>
          <IdleTimer />
          <Navbar />
          {children}
        </AuthProvider>

        {/* Ativação do Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('NWS ServiceWorker ativo no escopo:', registration.scope);
                    },
                    function(err) {
                      console.log('Falha ao registrar ServiceWorker:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}