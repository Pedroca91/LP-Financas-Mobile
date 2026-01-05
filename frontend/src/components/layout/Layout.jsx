import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Toaster } from '../ui/sonner';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
