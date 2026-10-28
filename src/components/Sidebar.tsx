/**
 * TMPSP v2.1 Sidebar Navigáció
 * Letisztult 260px jegybanki architektúra ikonokkal és fókuszállapotokkal.
 */

import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  Home,
  TrendingDown,
  Landmark,
  SlidersHorizontal,
  Activity,
  FileCheck2,
  TerminalSquare,
  FileText
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'm1' 
  | 'm2' 
  | 'm3' 
  | 'm4' 
  | 'calibration' 
  | 'scenarios' 
  | 'audit' 
  | 'tests' 
  | 'report';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  testPassedCount: number;
  totalTests: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  testPassedCount,
  totalTests,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Vezérlőpult & FSM', icon: LayoutDashboard },
    { id: 'm1' as ActiveTab, label: 'Modul 1: Hitelkoncentráció', icon: PieChart },
    { id: 'm2' as ActiveTab, label: 'Modul 2: Fedezeti Likviditás', icon: Home },
    { id: 'm3' as ActiveTab, label: 'Modul 3: Reálgazdaság', icon: TrendingDown },
    { id: 'm4' as ActiveTab, label: 'Modul 4: Fiskális Kockázat', icon: Landmark },
    { id: 'calibration' as ActiveTab, label: 'Küszöb-Kalibráció (AUC)', icon: SlidersHorizontal },
    { id: 'scenarios' as ActiveTab, label: 'Sokk-Teszt Szimulátor', icon: Activity },
    { id: 'audit' as ActiveTab, label: 'WORM Auditnapló', icon: FileCheck2 },
    {
      id: 'tests' as ActiveTab,
      label: 'Motor Tesztközpont',
      icon: TerminalSquare,
      badge: `${testPassedCount}/${totalTests}`,
      badgeColor: testPassedCount === totalTests ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
    },
    { id: 'report' as ActiveTab, label: 'Vezetői Riport (PDF)', icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/95 flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Makroprudenciális Rendszer
        </h2>
        <p className="text-sm font-bold text-white tracking-tight mt-0.5">
          TMPSP <span className="text-blue-500 font-mono text-xs">v2.1</span> Specifikáció
        </p>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rendszer garancia lábléc */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">WORM Napló:</span>
          <span className="text-emerald-400 font-mono">Aktív (SHA-256)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Nómenklatúra:</span>
          <span className="text-slate-300 font-mono">11 Fő / 15 Sor</span>
        </div>
        <div className="pt-1 text-[10px] text-slate-400 leading-tight">
          MNB Pénzügyi Stabilitási Tanács protokoll
        </div>
      </div>
    </aside>
  );
};
