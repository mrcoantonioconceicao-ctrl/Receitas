import React, { useState } from 'react';
import { TROUBLESHOOTING_ISSUES } from '../data/troubleshooting';
import { TroubleshootingIssue, Recipe } from '../types';
import { 
  AlertTriangle, 
  Search, 
  Microscope, 
  CheckCircle2, 
  HelpCircle, 
  Flame, 
  Sparkles, 
  Loader2,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface TroubleshootingTabProps {
  currentRecipe: Recipe;
}

export const TroubleshootingTab: React.FC<TroubleshootingTabProps> = ({
  currentRecipe,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<TroubleshootingIssue | null>(null);

  // AI Diagnostic State
  const [customProblem, setCustomProblem] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [aiDiagnosticResult, setAiDiagnosticResult] = useState<string | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Todas as Dúvidas' },
    { id: 'fermentacao', label: 'Não Cresceu / Fermento' },
    { id: 'massa', label: 'Massa Grudenta ou Dura' },
    { id: 'miolo', label: 'Pão Pesado ou Solado' },
    { id: 'casca', label: 'Casca & Forno' },
    { id: 'bolo', label: 'Bolos Caseiros' },
  ];

  const filteredIssues = TROUBLESHOOTING_ISSUES.filter((issue) => {
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.primaryRootCause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.symptoms.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleRequestAiDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProblem.trim()) return;

    setIsDiagnosing(true);
    setDiagnosticError(null);
    setAiDiagnosticResult(null);

    try {
      const response = await fetch('/api/gemini/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: customProblem,
          doughDetails: {
            recipeName: currentRecipe.name,
            recipeType: currentRecipe.type,
            baseFlourWeight: currentRecipe.baseFlourWeight,
            ingredients: currentRecipe.ingredients.map(i => `${i.name}: ${i.percentage}% (${i.weight}g)`),
            climate: currentRecipe.climate,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar diagnóstico.');
      }

      setAiDiagnosticResult(data.diagnosis);
    } catch (err: any) {
      setDiagnosticError(err.message || 'Falha na conexão com a vovó.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                CONSELHOS DA VOVÓ
              </span>
              <span className="text-xs text-stone-400">Socorro na Cozinha</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              O que Aconteceu com o meu Pão ou Bolo?
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Descubra por que a massa não cresceu, por que o bolo afundou no meio ou por que a casca ficou dura, com soluções fáceis e carinhosas para a próxima fornada.
            </p>
          </div>
        </div>
      </div>

      {/* AI Custom Friendly Investigation Box */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950/20 to-stone-900 border border-amber-500/30 rounded-2xl p-6 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            Pergunte à Vovó DoughCraft: Conte o que Aconteceu!
          </h3>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Descreva o que deu errado com a sua receita (ex: "o pão ficou massudo e pesado", "a massa não cresceu nada", "o bolo murchou quando tirei do forno"):
        </p>

        <form onSubmit={handleRequestAiDiagnostic} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customProblem}
              onChange={(e) => setCustomProblem(e.target.value)}
              placeholder="Ex: Fiz o pão certinho, mas ele ficou pesado por dentro e parecendo sola de sapato..."
              className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isDiagnosing || !customProblem.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold transition shrink-0"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A Vovó está pensando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Pedir Ajuda à Vovó
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Result Card */}
        {diagnosticError && (
          <div className="mt-4 p-3.5 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300">
            {diagnosticError}
          </div>
        )}

        {aiDiagnosticResult && (
          <div className="mt-4 p-5 bg-stone-950 border border-amber-500/40 rounded-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Conselho Carinhoso da Vovó DoughCraft
              </span>
              <span className="text-[10px] text-stone-400 font-mono">DoughCraft Assistente</span>
            </div>
            <div className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed font-sans">
              {aiDiagnosticResult}
            </div>
          </div>
        )}
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por sintoma ou falha..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technical Knowledge Base Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-semibold border border-stone-700/60">
                  {issue.category}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">ID: {issue.id}</span>
              </div>

              <h4 className="text-base font-bold text-white mb-2">{issue.title}</h4>

              {/* Symptoms */}
              <div className="mb-3 space-y-1">
                <span className="text-[11px] font-semibold text-stone-400 block uppercase">Sintomas Típicos:</span>
                <ul className="list-disc list-inside text-xs text-stone-300 space-y-0.5">
                  {issue.symptoms.map((s, idx) => (
                    <li key={idx} className="text-stone-300 leading-tight">{s}</li>
                  ))}
                </ul>
              </div>

              {/* Primary Cause */}
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl mb-3">
                <span className="text-[11px] font-bold text-red-400 block uppercase font-mono">
                  Por que isso acontece:
                </span>
                <p className="text-xs text-red-200/90 mt-0.5 leading-relaxed">
                  {issue.primaryRootCause}
                </p>
              </div>

              {/* Mechanism */}
              <div className="text-xs text-stone-300 leading-relaxed mb-3">
                <strong className="text-stone-200">O que aconteceu na massa:</strong> {issue.chemicalBiologicalMechanism}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 space-y-2 text-xs">
              <div className="text-emerald-300/90 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2.5">
                <strong className="text-emerald-400 block text-[11px] uppercase font-mono">Como a Vovó resolve:</strong>
                {issue.preventiveAdjustment}
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 font-mono">
                <span>Dica de Ouro:</span>
                <span className="text-amber-400 font-semibold">{issue.technicalMetric}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="text-center py-12 bg-stone-900 border border-stone-800 rounded-2xl p-6">
          <ShieldAlert className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <p className="text-sm text-stone-300 font-medium">Nenhuma dúvida parecida encontrada.</p>
          <p className="text-xs text-stone-400 mt-1">Escreva o que aconteceu na caixinha lá em cima para perguntar diretamente à Vovó.</p>
        </div>
      )}
    </div>
  );
};
