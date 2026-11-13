import React, { useState } from 'react';
import { Recipe, RecipeASTNode } from '../types';
import { buildRecipeAST, evaluateDeterministicAST } from '../utils/astEngine';
import { getHouseholdMeasureEstimate } from '../utils/bakersMath';
import {
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ASTVisualizerProps {
  recipe: Recipe;
}

export const ASTVisualizer: React.FC<ASTVisualizerProps> = ({ recipe }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const astRoot = buildRecipeAST(recipe);
  const evaluated = evaluateDeterministicAST(astRoot, recipe.climate, recipe.costing, recipe.targetUnits);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getGroupColor = (type: string) => {
    switch (type) {
      case 'ROOT_FLOUR':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
      case 'BRANCH_LIQUID':
        return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200';
      case 'SUBTREE_PREFERMENT':
        return 'border-purple-500/40 bg-purple-500/10 text-purple-200';
      case 'BRANCH_SALT':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
      case 'BRANCH_FERMENT':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
      case 'BRANCH_LIPID':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200';
      case 'BRANCH_SWEETENER':
        return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
      case 'BRANCH_ENRICHMENT':
        return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200';
      default:
        return 'border-stone-800 bg-stone-900/60 text-stone-200';
    }
  };

  const getCategoryForNode = (name: string, parentType: string): string => {
    if (parentType === 'BRANCH_LIQUID') return 'liquid';
    if (parentType === 'BRANCH_SALT') return 'salt';
    if (parentType === 'BRANCH_FERMENT') return 'ferment';
    if (parentType === 'BRANCH_LIPID') return 'fat';
    if (parentType === 'BRANCH_SWEETENER') return 'sugar';
    if (parentType === 'ROOT_FLOUR') return 'flour';
    if (name.toLowerCase().includes('ovo')) return 'egg';
    return 'other';
  };

  const renderGroup = (node: RecipeASTNode, depth = 0, parentType = 'ROOT_FLOUR') => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = node.type === 'LEAF_INGREDIENT';

    return (
      <div key={node.id} className="space-y-1.5" style={{ paddingLeft: `${depth * 18}px` }}>
        <div
          className={`p-3 rounded-xl border text-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${getGroupColor(
            node.type
          )}`}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                className="p-0.5 rounded hover:bg-white/10 text-stone-300"
                aria-label="Expandir ou recolher grupo"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <span className="font-bold text-sm">{node.name}</span>
              {isLeaf && (
                <span className="text-[11px] text-amber-300/90 font-sans">
                  ({getHouseholdMeasureEstimate(node.name, getCategoryForNode(node.name, parentType), node.weight)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="text-white font-bold text-sm">{Math.round(node.weight)} g</span>
            {node.costPerKg > 0 && (
              <span className="text-[11px] text-stone-300">
                ~R$ {((node.weight / 1000) * node.costPerKg).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-1.5 ml-2 pt-0.5">
            {node.children!.map((child) => renderGroup(child, depth + 1, node.type))}
          </div>
        )}
      </div>
    );
  };

  const liquidWeight = recipe.ingredients
    .filter((i) => i.category === 'liquid')
    .reduce((sum, i) => sum + i.weight, 0);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Resumo da Receita por Grupos de Ingredientes
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Veja todos os ingredientes separados por função (farinha, líquidos, fermento, gorduras e temperos) com medidas caseiras, gramas exatas e custo estimado.
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[11px] font-sans text-stone-400 block">Farinha Principal:</span>
          <span className="text-base font-bold text-amber-400">{Math.round(evaluated.rootFlourWeight)} g</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[11px] font-sans text-stone-400 block">Peso Total da Massa:</span>
          <span className="text-base font-bold text-white">{Math.round(evaluated.totalRawDoughWeight)} g</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[11px] font-sans text-stone-400 block">Água ou Leite:</span>
          <span className="text-base font-bold text-cyan-400">{Math.round(liquidWeight)} g</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
          <span className="text-[11px] font-sans text-stone-400 block">Custo Total Estimado:</span>
          <span className="text-base font-bold text-emerald-400">R$ {evaluated.totalBatchCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Friendly Validation Summary */}
      <div className="p-3.5 bg-stone-950/80 rounded-xl border border-stone-800/90 space-y-1.5">
        <span className="text-xs text-stone-300 font-semibold block">
          Conferência da Receita:
        </span>
        {evaluated.validationMessages.map((msg, i) => (
          <div key={i} className="text-xs text-stone-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
        ))}
      </div>

      {/* Groups View */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 overflow-x-auto space-y-2">
        <div className="text-xs text-stone-400 mb-2 flex items-center justify-between">
          <span>Ingredientes agrupados por função na massa:</span>
          <span className="text-stone-400 text-[11px]">Clique na setinha para abrir ou fechar</span>
        </div>
        {renderGroup(astRoot)}
      </div>
    </div>
  );
};
