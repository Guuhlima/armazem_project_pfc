import '../styles/globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ReactQueryProvider from './providers/react-query';
import 'sweetalert2/dist/sweetalert2.min.css';

export const metadata = {
  title: 'Armazem G3',
  description: 'Gerenciamento de Equipamentos',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-900 text-white">
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
