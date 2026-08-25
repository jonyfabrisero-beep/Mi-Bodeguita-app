import { ReactNode } from 'react';
import { LayoutDashboard, PackageSearch, ShoppingCart, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
    { id: 'inventory', icon: PackageSearch, label: 'Inventario' },
    { id: 'pos', icon: ShoppingCart, label: 'Vender' },
    { id: 'history', icon: History, label: 'Historial' },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col font-sans overflow-hidden bg-[#FFF9F0] text-[#2D3047]">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="w-full bg-[#2D3047] pb-safe z-40">
        <div className="flex justify-around items-center px-2 py-3 max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center p-2 min-w-[4rem] rounded-xl transition-all duration-300",
                  isActive ? "text-[#1AC0C6]" : "text-white/50 hover:text-white"
                )}
              >
                <div className="p-1 mb-1">
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
