import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ClipboardCopy, 
  Check 
} from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  onClose,
  recipe,
}) => {
  const [auditText, setAuditText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !auditText && !loading) {
      runAudit();
    }
  }, [isOpen]);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name: recipe.name,
            type: recipe.type,
            category: recipe.category,
            baseFlourWeight: recipe.baseFlourWeight,
            ingredients: recipe.ingredients.map(i => ({
              name: i.name,
              category: i.category,
              percentage: i.percentage,
              weight: i.weight,
              isFlour: i.isFlour,
              costPerKg: i.costPerKg,
            })),
            targetUnits: recipe.targetUnits,
          },
          environmentalConditions: recipe.climate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao auditar receita.');
      }

      setAuditText(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o assistente DoughCraft.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!auditText) return;
    navigator.clipboard.writeText(auditText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Dicas da Vovó para a sua Receita</h3>
              <p className="text-xs text-stone-400">Conselhos práticos e truques caseiros do DoughCraft</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-sm font-sans text-amber-300 font-semibold">
                Analisando a receita com todo o carinho...
              </p>
              <p className="text-xs text-stone-400">
                Avaliando "{recipe.name}" para garantir que saia alto, macio e delicioso!
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <strong className="font-bold text-red-200 block mb-1">Ops, tivemos uma dúvida:</strong>
                <p>{error}</p>
                <button
                  onClick={runAudit}
                  className="mt-3 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg text-xs font-semibold border border-red-800 transition"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {auditText && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-200 whitespace-pre-wrap leading-relaxed font-sans">
                {auditText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {auditText && (
          <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-mono">
              DoughCraft • Dicas Caseiras
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar Dicas'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
