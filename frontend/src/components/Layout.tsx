import Topbar from './Topbar';
import type { ReactNode } from 'react';

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <Topbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}