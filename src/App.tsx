import React, { useState } from 'react';
import { MASTER_RECIPES } from './data/masterRecipes';
import { Recipe } from './types';
import { Navbar, TabId } from './components/Navbar';
import { QuickEntryBar } from './components/QuickEntryBar';
import { FormulationTab } from './components/FormulationTab';
import { ClimateDDTTab } from './components/ClimateDDTTab';
import { CostingTab } from './components/CostingTab';
import { TroubleshootingTab } from './components/TroubleshootingTab';
import { AIAssistantTab } from './components/AIAssistantTab';
import { ToolsTab } from './components/ToolsTab';
import { RecipeModal } from './components/RecipeModal';
import { AuditModal } from './components/AuditModal';
import { TechnicalSheetModal } from './components/TechnicalSheetModal';
import { KitchenModeView } from './components/KitchenModeView';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('formulation');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>(() => MASTER_RECIPES[0]);
  const [externalAssistantPrompt, setExternalAssistantPrompt] = useState<string | null>(null);

  // Modal controls
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTechnicalSheetOpen, setIsTechnicalSheetOpen] = useState(false);
  const [isKitchenModeOpen, setIsKitchenModeOpen] = useState(false);

  const handleRecipeLoadedFromQuick = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setActiveTab('formulation');
  };

  const handleOpenAuditFromReform = (prompt: string) => {
    setExternalAssistantPrompt(prompt);
    setActiveTab('ai-assistant');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRecipeModal={() => setIsRecipeModalOpen(true)}
        onPrintTechnicalSheet={() => setIsTechnicalSheetOpen(true)}
        onOpenKitchenMode={() => setIsKitchenModeOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Entry Bar (Smart Defaults) - Available on all tabs */}
        <QuickEntryBar
          onRecipeLoaded={handleRecipeLoadedFromQuick}
          onOpenAuditTab={handleOpenAuditFromReform}
        />

        {activeTab === 'formulation' && (
          <FormulationTab
            recipe={currentRecipe}
            setRecipe={setCurrentRecipe}
            onOpenAudit={() => setIsAuditModalOpen(true)}
            onOpenKitchenMode={() => setIsKitchenModeOpen(true)}
          />
        )}

        {activeTab === 'climate' && (
          <ClimateDDTTab
            recipe={currentRecipe}
            setRecipe={setCurrentRecipe}
          />
        )}

        {activeTab === 'costing' && (
          <CostingTab
            recipe={currentRecipe}
            setRecipe={setCurrentRecipe}
          />
        )}

        {activeTab === 'troubleshooting' && (
          <TroubleshootingTab
            currentRecipe={currentRecipe}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <AIAssistantTab
            currentRecipe={currentRecipe}
            onLoadRecipeToWorkbench={handleRecipeLoadedFromQuick}
            externalPrompt={externalAssistantPrompt}
            onClearExternalPrompt={() => setExternalAssistantPrompt(null)}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsTab />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-stone-800/80 bg-stone-950 py-4 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-stone-300 font-bold">DoughCraft</span>
            <span className="text-amber-400 font-sans font-medium">• Seu Assistente Amigo de Pães, Bolos, Tortas e Massas Caseiras</span>
          </div>
          <div>
            Receitas simples, claras e em gramas exatas com ingredientes de mercado
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSelectRecipe={(newRec) => setCurrentRecipe(newRec)}
      />

      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        recipe={currentRecipe}
      />

      <TechnicalSheetModal
        isOpen={isTechnicalSheetOpen}
        onClose={() => setIsTechnicalSheetOpen(false)}
        recipe={currentRecipe}
      />

      {isKitchenModeOpen && (
        <KitchenModeView
          recipe={currentRecipe}
          onExit={() => setIsKitchenModeOpen(false)}
        />
      )}
    </div>
  );
}
