import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'G-Midia — Gestor Inteligente de Redes Sociais',
  description: 'Centro de comando para a sua presença digital. Facebook first, IA assistida.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
