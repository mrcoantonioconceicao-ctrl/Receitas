import React, { useState } from 'react';
import { Recipe, RecipeASTNode, EvaluatedAST } from '../types';
import { buildRecipeAST, evaluateDeterministicAST } from '../utils/astEngine';
import { 
  GitFork, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Droplet, 
  Scale, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Binary
} from 'lucide-react';

interface ASTVisualizerProps {
  recipe: Recipe;
}

export const ASTVisualizer: React.FC<ASTVisualizerProps> = ({ recipe }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const astRoot = buildRecipeAST(recipe);
  const evaluated = evaluateDeterministicAST(astRoot, recipe.climate, recipe.costing);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'ROOT_FLOUR':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-300';
      case 'BRANCH_LIQUID':
        return 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300';
      case 'SUBTREE_PREFERMENT':
        return 'border-purple-500/50 bg-purple-500/10 text-purple-300';
      case 'BRANCH_SALT':
        return 'border-rose-500/50 bg-rose-500/10 text-rose-300';
      case 'BRANCH_FERMENT':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
      case 'BRANCH_LIPID':
        return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300';
      case 'BRANCH_SWEETENER':
        return 'border-orange-500/50 bg-orange-500/10 text-orange-300';
      case 'BRANCH_ENRICHMENT':
        return 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300';
      default:
        return 'border-stone-800 bg-stone-900/60 text-stone-200';
    }
  };

  const renderNode = (node: RecipeASTNode, depth = 0) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="space-y-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
        <div className={`p-2.5 rounded-xl border text-xs font-mono transition flex items-center justify-between ${getNodeColor(node.type)}`}>
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                className="p-0.5 rounded hover:bg-white/10 text-stone-400"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-4 h-4 rounded-full bg-stone-800 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{node.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-mono text-stone-300">
                {node.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="font-bold text-amber-300">{node.percentage.toFixed(1)}%</span>
            <span className="text-white font-semibold">{Math.round(node.weight)}g</span>
            {node.costPerKg > 0 && (
              <span className="text-[10px] text-stone-400">R$ {node.costPerKg.toFixed(2)}/kg</span>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-1.5 border-l border-stone-800/80 ml-2">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <GitFork className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <span>Árvore de Sintaxe Abstrata (AST) da Receita</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Motor Determinístico
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            A matemática pesada, proporções e balanceamento térmico (DDT) são avaliados deterministamente pela estrutura em nós da AST. O nó raiz define estritamente a farinha base (100% / 1000g).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-stone-400 px-3 py-1 rounded-lg bg-stone-950 border border-stone-800">
            Profundidade: <strong className="text-amber-400">{evaluated.astDepth} níveis</strong> | Nós: <strong className="text-white">{evaluated.nodesCount}</strong>
          </span>
        </div>
      </div>

      {/* Deterministic Evaluation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[10px] text-stone-400 block uppercase">Nó Raiz (Farinha Base):</span>
          <span className="text-base font-bold text-amber-400">{evaluated.rootFlourWeight}g (100%)</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[10px] text-stone-400 block uppercase">Massa Total Determinística:</span>
          <span className="text-base font-bold text-white">{Math.round(evaluated.totalRawDoughWeight)}g</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[10px] text-stone-400 block uppercase">Hidratação Real Global:</span>
          <span className="text-base font-bold text-cyan-400">{evaluated.realGlobalHydrationPct.toFixed(1)}%</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[10px] text-stone-400 block uppercase">Custo Total do Lote (AST):</span>
          <span className="text-base font-bold text-emerald-400">R$ {evaluated.totalBatchCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Validation Messages from Deterministic AST */}
      <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800/90 space-y-1.5">
        <span className="text-[11px] font-mono text-stone-400 font-semibold block uppercase">
          Validação do Compilador de Nós:
        </span>
        {evaluated.validationMessages.map((msg, i) => (
          <div key={i} className="text-xs text-stone-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
        ))}
      </div>

      {/* Tree Visualization */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 overflow-x-auto space-y-2">
        <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Hierarquia de Nós da AST:</span>
          <span className="text-stone-400">Clique para expandir/recolher ramos</span>
        </div>
        {renderNode(astRoot)}
      </div>

      {/* Responsibility Architecture Callout */}
      <div className="p-4 rounded-xl bg-stone-950/90 border border-stone-800/80 flex items-start gap-3 text-xs text-stone-300">
        <Binary className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 block font-semibold mb-0.5">
            Arquitetura de Separação de Responsabilidades (AST vs. IA):
          </strong>
          <p className="text-stone-400 leading-relaxed">
            • <strong className="text-stone-200">Motor Determinístico (AST):</strong> Processa proporções de padeiro, balanço térmico de massas (DDT), conservação de matéria em gramas e custos unitários sem risco de alucinação numérica.<br />
            • <strong className="text-stone-200">Motor Cognitivo (IA Gemini 3.8 Flash):</strong> Realiza auditorias qualitativas de glúten, recomenda ordens de adição de ingredientes, diagnostica causas raízes de anomalias microbiológicas e sugere melhorias de processo.
          </p>
        </div>
      </div>
    </div>
  );
};
