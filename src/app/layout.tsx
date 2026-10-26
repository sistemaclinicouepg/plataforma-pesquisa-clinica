import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppNav from "@/components/AppNav";
import KeepAlive from "@/components/KeepAlive";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plataforma de Pesquisa Clínica Odontológica | UEPG",
  description: "Sistema Integrado de Ensaios Clínicos Odontológicos e Prontuário Digital",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Desativa e desregistra imediatamente qualquer Service Worker/cache legado no navegador */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var i = 0; i < names.length; i++) { caches.delete(names[i]); }
                  });
                }
                try {
                  localStorage.removeItem('uepg_clinical_offline_queue');
                  localStorage.removeItem('uepg_offline_synced');
                } catch(e) {}
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 w-full overflow-x-hidden">
        <KeepAlive />
        <AppNav />
        <main className="flex-1 flex flex-col w-full min-h-0">{children}</main>
      </body>
    </html>
  );
}

