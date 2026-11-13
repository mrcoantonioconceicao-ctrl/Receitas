import React, { useState } from 'react';
import { MASTER_RECIPES } from '../data/masterRecipes';
import { Recipe } from '../types';
import { calculateHydrationMetrics } from '../utils/bakersMath';
import { 
  X, 
  BookOpen, 
  ArrowRight, 
  Droplet, 
  Clock, 
  Layers, 
  Check, 
  Search 
} from 'lucide-react';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = MASTER_RECIPES.filter((r) => {
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Caderno de Receitas da Vovó</h3>
              <p className="text-xs text-stone-400">Pães e bolos caseiros com medidas em gramas e xícaras para você fazer em casa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-stone-950/70 border-b border-stone-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pão, bolo ou rosca..."
              className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Todas as Receitas' },
              { id: 'bread', label: 'Pães Caseiros' },
              { id: 'cake', label: 'Bolos de Vó' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  selectedType === t.id
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Cards Grid */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {filtered.map((item) => {
            const hydr = calculateHydrationMetrics(item.ingredients, item.baseFlourWeight);
            return (
              <div
                key={item.id}
                className="bg-stone-950/80 border border-stone-800 hover:border-amber-500/50 rounded-xl p-4 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      {item.category}
                    </span>
                    <span className="text-xs text-stone-400">
                      {item.ingredients.length} ingredientes simples
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                    {item.name}
                  </h4>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-mono text-stone-300 pt-1">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Droplet className="w-3.5 h-3.5" />
                      {hydr.formulaWaterWeight > 0 ? `${Math.round(hydr.formulaWaterWeight)}g líquidos` : 'Líquido moderado'}
                    </span>
                    <span className="flex items-center gap-1 text-stone-400">
                      <Layers className="w-3.5 h-3.5" />
                      {item.baseFlourWeight}g Farinha
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      Rende {item.targetUnits}{' '}
                      {item.name.toLowerCase().includes('cuca')
                        ? item.targetUnits === 1
                          ? 'cuca grande'
                          : 'cucas'
                        : item.type === 'cake'
                        ? item.targetUnits === 1
                          ? 'bolo'
                          : 'bolos'
                        : item.targetUnits === 1
                        ? 'pão médio'
                        : 'pães médios'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectRecipe(item);
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shrink-0 shadow-sm"
                >
                  <span>Fazer Essa Receita</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
