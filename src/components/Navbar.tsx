import React from 'react';
import { 
  FlaskConical, 
  Thermometer, 
  DollarSign, 
  AlertTriangle, 
  Bot, 
  Calculator, 
  Printer, 
  BookOpen, 
  Wheat,
  TabletSmartphone
} from 'lucide-react';

export type TabId = 
  | 'formulation' 
  | 'climate' 
  | 'costing' 
  | 'troubleshooting' 
  | 'ai-assistant' 
  | 'tools';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onOpenRecipeModal: () => void;
  onPrintTechnicalSheet: () => void;
  onOpenKitchenMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRecipeModal,
  onPrintTechnicalSheet,
  onOpenKitchenMode,
}) => {
  const tabs = [
    { id: 'formulation' as TabId, label: 'Receita & Medidas', icon: Wheat },
    { id: 'climate' as TabId, label: 'Temperatura da Água', icon: Thermometer },
    { id: 'costing' as TabId, label: 'Custos & Rendimento', icon: DollarSign },
    { id: 'troubleshooting' as TabId, label: 'Dicas & Soluções', icon: AlertTriangle },
    { id: 'ai-assistant' as TabId, label: 'Falar com DoughCraft', icon: Bot },
    { id: 'tools' as TabId, label: 'Conversores', icon: Calculator },
  ];

  return (
    <header className="no-print sticky top-0 z-50 bg-stone-900/90 backdrop-blur-md border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <Wheat className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-mono whitespace-nowrap">DoughCraft</span>
                <span className="hidden sm:inline-block text-xs px-2 py-0.5 font-sans bg-amber-500/20 text-amber-300 rounded-full font-semibold border border-amber-500/30 whitespace-nowrap">
                  Assistente Culinário
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-stone-400 font-medium truncate">
                Pães e bolos caseiros simples, fáceis e perfeitos
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenKitchenMode}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-white text-stone-950 text-xs font-bold border border-stone-200 transition whitespace-nowrap shrink-0 shadow-sm"
              title="Leitura com fontes grandes e contraste alto para usar na cozinha"
            >
              <TabletSmartphone className="w-3.5 h-3.5" />
              <span>Modo Cozinha</span>
            </button>
            <button
              type="button"
              onClick={onOpenRecipeModal}
              className="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition whitespace-nowrap shrink-0"
              title="Ver receitas clássicas testadas"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Livro de Receitas</span>
            </button>
            <button
              type="button"
              onClick={onPrintTechnicalSheet}
              className="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-sm whitespace-nowrap shrink-0"
              title="Imprimir receita para fazer na cozinha"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir Receita</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-stone-800/60 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
