import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Membros - Igreja',
  description: 'Gerenciamento de membros da Igreja',
}

// Script inline para aplicar tema antes do React hidratar (evita flash).
// Lógica: aplica dark se salvo como 'dark',
//         OU se o sistema preferir dark E o usuário não tiver salvo 'light' explicitamente.
// Usar t!=='light' em vez de t===null garante que qualquer valor que não seja
// 'light' (incluindo null, undefined, 'system') respeite a preferência do sistema.
const themeScript = `(function(){try{var t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
