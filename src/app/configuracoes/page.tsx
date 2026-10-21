'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sliders } from 'lucide-react';

function ConfiguracoesRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let projectId = searchParams.get('projectId');
    if (!projectId && typeof window !== 'undefined') {
      projectId = localStorage.getItem('app_active_project_id');
    }

    if (projectId) {
      router.replace(`/dashboard?projectId=${projectId}&tab=settings`);
    } else {
      router.replace('/dashboard?tab=settings');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 animate-bounce">
        <Sliders className="w-6 h-6" />
      </div>
      <p className="text-sm font-bold text-slate-700">Carregando dados e configurações do estudo...</p>
      <p className="text-xs text-slate-400 mt-1">Redirecionando para o painel padronizado.</p>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfiguracoesRedirectInner />
    </Suspense>
  );
}
