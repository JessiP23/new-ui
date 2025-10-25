import Topbar from './Topbar';
import type { ReactNode } from 'react';

interface LayoutProps { 
  children: ReactNode 
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Topbar />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}