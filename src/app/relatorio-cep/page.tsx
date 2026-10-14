'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  useEffect(() => {
    router.replace(projectId ? `/dashboard?projectId=${projectId}` : '/');
  }, [projectId, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center text-slate-500 text-xs font-semibold">
        Redirecionando para o Prontuário e Atendimento...
      </div>
    </div>
  );
}

export default function RelatorioCepPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <RedirectContent />
    </Suspense>
  );
}
