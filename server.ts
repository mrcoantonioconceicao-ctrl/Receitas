import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with required headers
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const DOUGHCRAFT_SYSTEM_INSTRUCTION = `Você é o DoughCraft, um assistente culinário extremamente acolhedor, simples e direto, criado para ajudar pessoas comuns (como avós, mães, pais e iniciantes) a fazerem pães e bolos caseiros perfeitos usando apenas o que têm em casa.

Regras operacionais estritas:
1. LINGUAGEM DE VÓ E ZERO JARGÕES:
- NUNCA utilize termos técnicos profissionais, científicos ou industriais (como levain, bassinage, hidratação percentual, T65, DDT, autólise, AST ou termos de laboratório).
- Use linguagem natural, carinhosa, paciente e acolhedora (como uma vovó experiente e amorosa ensinando na cozinha de casa).
- Apresente SEMPRE as medidas caseiras fáceis (xícaras, colheres, copos) acompanhadas do peso exato em gramas (ex: "500g de farinha de trigo, que dá mais ou menos 4 xícaras de chá", "300ml de água morna, cerca de 1 copo e 1/4 americano", "2 colheres de sopa de açúcar [30g]").

2. FLUXO DE QUANTIDADE SIMPLES (BASE INICIAL DE 500G):
- Quando o usuário escolher um produto ou digitar apenas o nome (ex: "pão caseiro", "pão", "bolo de fubá", "pão doce"):
  - Assuma obrigatoriamente a base prática inicial de 500g de farinha de trigo (ideal para render 2 pães caseiros médios macios ou 1 forma de bolo caseiro).
  - Se o usuário pedir qualquer quantidade diferente (ex: "quero fazer com 1kg", "quero fazer 1 pão só", "quero fazer metade", "quero com 300g"), recalcule imediatamente todas as medidas e entregue a receita inteira atualizada.

3. RECEITA INTEIRA E MASTIGADA (ESTRUTURA EM DUAS PARTES):
Sempre entregue a receita completinha, recalculada e pronta para usar, dividida em duas partes muito claras e fáceis de ler:
- "🧺 O que você vai precisar" (com ingredientes comuns de mercadinho: farinha de trigo comum, água ou leite morno, óleo ou manteiga, açúcar, sal e fermento biológico de pacotinho ou fresco).
- "👩‍🍳 Como fazer" (passo a passo bem detalhado, explicando truques simples como a água morninha estilo banho de bebê que não queima o dedo, a massa descansando coberta com pano de prato limpo dentro do forno desligado para não pegar vento frio, e o ponto da massa macia que não gruda nas mãos).

4. ENCERRAMENTO ACOLHEDOR:
Finalize sempre de forma amigável e prestativa:
"Quer que eu ajuste alguma coisa para você? Se quiser fazer mais pães (como com 1 kg de farinha), trocar a água por leite, colocar um recheio gostoso ou usar manteiga, é só me falar que recalculo tudinho na hora para você!"`;

// Endpoint: General Chat / Formulation Consultation with DoughCraft Core
app.post('/api/gemini/chat', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'API Key do Gemini não configurada no servidor (verifique Settings > Secrets).',
      });
    }

    const { message, history, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
    }

    let contents: any[] = [];

    // Append context if provided (e.g. current recipe state or climate parameters)
    let fullSystem = DOUGHCRAFT_SYSTEM_INSTRUCTION;
    if (context) {
      fullSystem += `\n\n[CONTEXTO ATUAL DO LABORATÓRIO DO USUÁRIO]:\n${JSON.stringify(context, null, 2)}`;
    }

    // Convert past history if provided
    if (Array.isArray(history) && history.length > 0) {
      contents = history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: fullSystem,
      },
    });

    res.json({ text: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao processar requisição no DoughCraft Core.',
    });
  }
});

// Endpoint: Recipe Technical Auditor & Optimizer
app.post('/api/gemini/audit', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'API Key do Gemini não configurada no servidor.',
      });
    }

    const { recipe, environmentalConditions } = req.body;
    const prompt = `Analise e audite tecnicamente a seguinte fórmula de panificação/confeitaria com rigor de laboratório:
Dados da Receita:
${JSON.stringify(recipe, null, 2)}

Condições Ambientais:
${JSON.stringify(environmentalConditions || {}, null, 2)}

Forneça:
1. Auditoria da hidratação total real e balanço da fórmula.
2. Análise de adequação da fermentação e temperatura da água recomendada (DDT).
3. Avaliação de pontos críticos de controle (autólise, desenvolvimento de glúten, dobras, forneamento).
4. Otimizações recomendadas de rendimento e custo.
5. Ficha técnica formatada em tabela de Percentual de Padeiro.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: DOUGHCRAFT_SYSTEM_INSTRUCTION,
      },
    });

    res.json({ analysis: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Audit Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao auditar receita.',
    });
  }
});

// Endpoint: Technical Troubleshooting Diagnostic
app.post('/api/gemini/diagnose', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'API Key do Gemini não configurada no servidor.',
      });
    }

    const { problemDescription, doughDetails } = req.body;
    const prompt = `DIAGNÓSTICO TÉCNICO DE FALHA EM PANIFICAÇÃO / CONFEITARIA:
Sintomas relatados pelo operador: "${problemDescription}"
Parâmetros da massa / processo:
${JSON.stringify(doughDetails || {}, null, 2)}

Apresente um laudo técnico contendo:
- Identificação da Causa Raiz Primária (Físico-química, enzimática ou microbiológica)
- Causas Secundárias prováveis
- Correção Imediata no lote atual (se recuperável)
- Ajuste Preventivo de Formulação e Processo para as próximas fornadas
- Indicadores de verificação (ex: teste do toque, expansão volumétrica %, temperatura no centro da massa).`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: DOUGHCRAFT_SYSTEM_INSTRUCTION,
      },
    });

    res.json({ diagnosis: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Diagnostic Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao gerar diagnóstico técnico.',
    });
  }
});

// Endpoint: Smart Defaults Quick Formulate (Regra de Entrada Rápida)
app.post('/api/gemini/quick-formulate', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'API Key do Gemini não configurada no servidor.',
      });
    }

    const { productName } = req.body;
    if (!productName || typeof productName !== 'string') {
      return res.status(400).json({ error: 'Nome do produto inválido ou ausente.' });
    }

    const prompt = `RECEITA CASEIRA DA VOVÓ - DOUGHCRAFT:
O usuário quer a receita de: "${productName}".
Crie uma receita caseira quentinha, simples e perfeita, com base prática inicial de 500g de farinha de trigo (rende 2 pães caseiros médios macios ou 1 bolo de forma).
Use APENAS ingredientes comuns de mercado (farinha de trigo comum, água ou leite morno, sal, fermento de pacotinho, açúcar, óleo ou manteiga, ovos).
NUNCA use jargões técnicos difíceis. Para cada ingrediente, indique a medida caseira (xícaras, colheres, copos) e o peso em gramas.

Responda em formato JSON com o seguinte schema:
- name: string (Nome carinhoso da receita, ex: "Pão Caseiro da Vovó", "Bolo de Fubá com Erva-Doce")
- type: 'bread' | 'pastry' | 'cake'
- category: string (ex: 'Pães Caseiros da Vovó', 'Bolos Simples de Casa')
- description: string (descrição acolhedora explicando o aroma e que rende 2 pãezinhos médios fofinhos)
- baseFlourWeight: 500 (estipule 500g como base prática inicial)
- targetUnits: 2 (2 pães ou 1 bolo)
- targetBakedWeightPerUnit: 380 (peso assado de cada pão em gramas)
- ingredients: array de { name: string, category: 'flour'|'liquid'|'ferment'|'salt'|'fat'|'sugar'|'egg'|'enrichment'|'other', percentage: number, weight: number, isFlour: boolean, costPerKg: number, notes: string } (coloque a medida caseira em notes, ex: "cerca de 4 xícaras de chá cheias", "1 copo e 1/4 de água morninha", "1 colher de sopa rasa", "2 colheres de sopa de açúcar", "3 colheres de sopa de óleo")
- climate: { roomTemp: 24, flourTemp: 22, desiredDoughTemp: 26, prefermentTemp: 22, hasPreferment: false, relativeHumidity: 60, mixerType: 'manual', frictionFactor: 2, tapWaterTemp: 22 }
- costing: { bakeLossPercentage: 14, packagingCostPerUnit: 0.5, energyGasCostPerBatch: 3.0, laborOverheadPercentage: 10, markupMultiplier: 2.5, targetMarginPercent: 60 }
- steps: array de { name: string, durationMinutes: number, description: string, criticalControlPoint: string } (passos mastigados: 1. Ativar o fermento com água morninha estilo banho de bebê e açúcar; 2. Misturar a farinha na tigela; 3. Sovar com carinho até ficar macia e não grudar nas mãos; 4. Deixar descansar coberta com pano de prato dentro do forno desligado até dobrar de tamanho; 5. Modelar 2 pães e assar até dourar e cheirar a casa inteira)
- activeReformulationQuestion: string ("Quer que eu adapte essa receita para você? Se quiser fazer mais (com 1 kg de farinha), trocar a água por leite ou usar manteiga em vez de óleo, me diga que recalculou todinho na hora!")
- summaryMarkdown: string (Estruturado em duas partes claras: '### 🧺 O que você vai precisar' com xícaras e gramas, e '### 👩‍🍳 Como fazer' com o passo a passo detalhado e truques da vovó)`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: DOUGHCRAFT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text ?? '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Quick Formulate Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao formular produto com Smart Defaults.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`DoughCraft Core server listening on port ${port}`);
  });
}

startServer();
