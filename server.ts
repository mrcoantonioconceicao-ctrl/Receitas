import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

const DOUGHCRAFT_MODEL = 'gemini-4-hydrogen';

const DOUGHCRAFT_SYSTEM_INSTRUCTION = `Você é o DoughCraft, um assistente culinário extremamente acolhedor, simples e direto, criado para ajudar pessoas comuns (como avós, mães, pais e iniciantes) a fazerem pães, cucas e bolos caseiros perfeitos usando apenas o que têm em casa.

Regras operacionais e matemáticas estritas:
1. LINGUAGEM DE VÓ E ZERO JARGÕES TÉCNICOS:
- NUNCA utilize termos técnicos profissionais, científicos ou industriais (como levain, bassinage, hidratação percentual, T65, DDT, autólise, AST, nós e ramos, pH, alveolagem, cinética, ponto de véu ou termos de laboratório).
- Use linguagem natural, carinhosa, paciente e acolhedora (como uma vovó experiente e amorosa ensinando na cozinha de casa).
- Apresente SEMPRE as medidas caseiras fáceis (xícaras, colheres, copos) acompanhadas do peso exato em gramas (ex: "500g de farinha de trigo, que dá mais ou menos 4 xícaras de chá", "300ml de água morna, cerca de 1 copo e 1/4 americano", "2 colheres de sopa de açúcar [30g]").

2. REGRA DE RECONHECIMENTO DE RECEITAS:
- Se o usuário pedir "Cuca" (ou "cuca de uva", "cuca de banana"): entregue uma deliciosa Cuca Alemã caseira com massa fofinha batida na tigela, cobertura de uva ou banana (conforme pedido) e a famosa farofinha doce crocante de manteiga gelada, açúcar e canela por cima, usando 500g de farinha base (375g na massa + 125g na farofinha).
- Se o usuário pedir "Bolo de fubá": entregue a receita de Bolo de Fubá Cremoso caseiro (com camada cremosa no meio tipo pudim, explicando em linguagem de vó que a massa vai líquida para o forno mesmo).
- Se o usuário pedir "Pão caseiro": entregue e mantenha o Pão Caseiro Fofinho tradicional (500g de farinha base, rendendo 2 pães médios de cerca de 400g a 440g cada).
- Sempre recalcule xícaras e gramas exatamente para o prato pedido.

3. CÁLCULO DE RENDIMENTO COERENTE E BASE PRÁTICA:
- Quando o usuário digitar apenas o nome de um produto, assuma a base prática inicial de 500g de farinha de trigo (ou a proporção tradicional para bolos), com rendimento realista para cozinha doméstica:
  - Exemplo: Para uma receita com 1 kg de farinha (massa total em torno de 1.700g a 1.800g), o rendimento correto é de "2 pães médios de aproximadamente 850g a 900g cada" (ou 3 a 4 pães menores). NUNCA invente centenas de pãezinhos microscópicos de 2 gramas!
- Se o usuário pedir qualquer alteração (ex: "quero fazer com 1kg", "quero fazer metade", "deixa mais docinho", "troca o óleo por manteiga"), recalcule todas as medidas proporcionalmente, confira a soma dos pesos e entregue a receita inteira atualizada na hora.

4. ESTRUTURA DA RECEITA CLARA (DUAS PARTES OBRIGATÓRIAS):
Sempre entregue a receita completinha, recalculada e dividida em duas partes muito claras:
- "🧺 O que você vai precisar" (com ingredientes comuns de mercado: farinha de trigo comum, fubá, água ou leite morno, óleo ou manteiga, açúcar, sal, ovos, frutas para cuca e fermento biológico de pacotinho ou fermento de bolo, listando sempre xícaras/colheres e gramas).
- "👩‍🍳 Como fazer" (passo a passo bem detalhado, explicando truques simples como a temperatura da água morna estilo banho de bebê que não queima o dedo, sovar até ficar macia sem grudar nas mãos, o descanso coberta com pano de prato limpo dentro do forno desligado sem corrente de ar, e pincelar manteiga na casca ainda quente).

5. ENCERRAMENTO ACOLHEDOR:
Finalize sempre perguntando com carinho se a pessoa quer ajustar algum detalhe (dobrar a receita, fazer metade, trocar água por leite ou deixar mais docinho).`;

// Endpoint: General Chat / Formulation Consultation with DoughCraft
app.post('/api/gemini/chat', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'Chave da API do Gemini não configurada no servidor (verifique Settings > Secrets).',
      });
    }

    const { message, history, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
    }

    let contents: any[] = [];

    let fullSystem = DOUGHCRAFT_SYSTEM_INSTRUCTION;
    if (context) {
      fullSystem += `\n\n[RECEITA ATUAL NA BANCADA DO USUÁRIO]:\n${JSON.stringify(context, null, 2)}`;
    }

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
      model: DOUGHCRAFT_MODEL,
      contents: contents,
      config: {
        systemInstruction: fullSystem,
      },
    });

    res.json({ text: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao conversar com o assistente.',
    });
  }
});

// Endpoint: Recipe Friendly Advice & Tips
app.post('/api/gemini/audit', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'Chave da API do Gemini não configurada no servidor.',
      });
    }

    const { recipe, environmentalConditions } = req.body;
    const prompt = `DICAS E CONSELHOS DA VOVÓ DOUGHCRAFT:
Analise a receita caseira abaixo com todo o carinho e cuidado de uma vovó experiente:
Dados da Receita:
${JSON.stringify(recipe, null, 2)}

Temperatura da Cozinha:
${JSON.stringify(environmentalConditions || {}, null, 2)}

Forneça conselhos práticos e acolhedores em linguagem simples e carinhosa:
1. Avaliação carinhosa da receita (se a quantidade de água/leite e óleo/manteiga está boa para o pão, cuca ou bolo ficar bem fofinho e macio, e se o rendimento de unidades e peso por peça está coerente).
2. O segredo da água ou leite morninho (temperatura suave de banho de bebê) para o fermento crescer com força.
3. Dicas de ouro do preparo (sovar até ficar macia sem grudar nas mãos, ou bater na tigela no caso de cuca/bolo, descanso coberto com pano de prato dentro do forno desligado sem vento).
4. Como assar para ficar com a casquinha ou farofinha bem dourada e perfumar a casa inteira.
NUNCA use jargões difíceis (sem autólise, sem DDT, sem levain, sem bassinage, sem T65, sem hidratação percentual, sem AST, sem nós e ramos). Use medidas de xícaras e colheres junto com gramas.`;

    const response = await aiClient.models.generateContent({
      model: DOUGHCRAFT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DOUGHCRAFT_SYSTEM_INSTRUCTION,
      },
    });

    res.json({ analysis: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Audit Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao gerar dicas para a receita.',
    });
  }
});

// Endpoint: Friendly Kitchen Troubleshooting
app.post('/api/gemini/diagnose', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'Chave da API do Gemini não configurada no servidor.',
      });
    }

    const { problemDescription, doughDetails } = req.body;
    const prompt = `AJUDA DA VOVÓ DOUGHCRAFT - O QUE DEU ERRADO COM O PÃO, CUCA OU BOLO:
O usuário está na cozinha com a seguinte dúvida ou problema: "${problemDescription}"
Detalhes da receita:
${JSON.stringify(doughDetails || {}, null, 2)}

Escreva uma resposta extremamente carinhosa, acolhedora e simples (estilo vovó experiente que acalma e ensina com paciência):
- Explique em palavras simples por que isso aconteceu (sem usar termos técnicos como levain, DDT, autólise, pH, AST, nós e ramos, ou nomes científicos).
- Como consertar ou aproveitar agora (se ainda der tempo).
- O truque da vovó para a próxima fornada sair perfeita, fofinha e cheirosa.
- Finalize com uma palavra de incentivo carinhosa.`;

    const response = await aiClient.models.generateContent({
      model: DOUGHCRAFT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DOUGHCRAFT_SYSTEM_INSTRUCTION,
      },
    });

    res.json({ diagnosis: response.text ?? '' });
  } catch (error: any) {
    console.error('Gemini Diagnostic Error:', error);
    res.status(500).json({
      error: error.message || 'Erro ao gerar conselho da vovó.',
    });
  }
});

// Endpoint: Quick Formulate (Base prática de 500g)
app.post('/api/gemini/quick-formulate', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(500).json({
        error: 'Chave da API do Gemini não configurada no servidor.',
      });
    }

    const { productName } = req.body;
    if (!productName || typeof productName !== 'string') {
      return res.status(400).json({ error: 'Nome do produto inválido ou ausente.' });
    }

    const prompt = `RECEITA CASEIRA DA VOVÓ - DOUGHCRAFT:
O usuário digitou exatamente na busca: "${productName}".
Siga rigorosamente a Regra de Reconhecimento de Receitas:
- Se for "Cuca" (ex: cuca, cuca de uva, cuca de banana ou outro sabor), gere uma deliciosa Cuca Alemã caseira com massa fofinha, cobertura da fruta pedida (uva ou banana por padrão) e a famosa farofinha doce crocante por cima, usando 500g de farinha base (375g na massa + 125g na farofinha).
- Se for "Bolo de fubá", gere um Bolo de Fubá Cremoso caseiro (com camada cremosa tipo pudim).
- Se for "Pão caseiro", gere um Pão Caseiro Fofinho tradicional (500g de farinha base, rendendo 2 pães médios).
- Para qualquer outro prato pedido, crie a receita caseira quentinha e fiel exatamente ao prato pedido, usando 500g de farinha base (ou a proporção tradicional caseira para bolos).

Use APENAS ingredientes comuns de mercado (farinha de trigo comum, fubá, água ou leite morno, sal, fermento de pacotinho ou fermento em pó de bolo, açúcar, óleo ou manteiga, ovos, frutas).
NUNCA use jargões técnicos (proibido levain, bassinage, hidratação percentual, T65, DDT, autólise, AST, nós e ramos). Para cada ingrediente, indique a medida caseira (xícaras, colheres, copos) junto com o peso em gramas.
Calcule o rendimento de forma 100% coerente: para 500g de farinha de pão (~880g de massa), targetUnits = 2 e targetBakedWeightPerUnit em torno de 380g a 400g (para bolo ou cuca grande, targetUnits = 1 e targetBakedWeightPerUnit em torno de 900g a 1400g).

Responda em formato JSON com o seguinte schema:
- name: string (Nome carinhoso fiel ao pedido, ex: "Cuca Alemã Caseira de Uva", "Bolo de Fubá Cremoso da Vovó", "Pão Caseiro Fofinho")
- type: 'bread' | 'pastry' | 'cake'
- category: string (ex: 'Receita Tradicional de Vó')
- description: string (descrição acolhedora explicando o aroma, a textura e o rendimento realista)
- baseFlourWeight: number (500 para pães e cucas; ou soma das farinhas para bolos)
- targetUnits: number (ex: 2 para pães ou 1 para bolo/cuca grande)
- targetBakedWeightPerUnit: number (peso realista assado de cada pão/bolo/cuca em gramas)
- ingredients: array de { name: string, category: 'flour'|'liquid'|'ferment'|'salt'|'fat'|'sugar'|'egg'|'enrichment'|'other', percentage: number, weight: number, isFlour: boolean, costPerKg: number, notes: string } (coloque uma dica simples do ingrediente em notes, sem jargões)
- climate: { roomTemp: 24, flourTemp: 22, desiredDoughTemp: 26, prefermentTemp: 22, hasPreferment: false, relativeHumidity: 60, mixerType: 'manual', frictionFactor: 2, tapWaterTemp: 22 }
- costing: { bakeLossPercentage: 12, packagingCostPerUnit: 0.5, energyGasCostPerBatch: 3.5, laborOverheadPercentage: 15, markupMultiplier: 3.0, targetMarginPercent: 65 }
- steps: array de { name: string, durationMinutes: number, description: string, criticalControlPoint: string } (passos detalhados e simples em linguagem de vó, específicos para o prato pedido)
- activeReformulationQuestion: string ("Quer que eu adapte essa receita para você? Se quiser dobrar para 1 kg de farinha, fazer metade, trocar algum ingrediente ou mudar o sabor, me diga que recalculo tudinho na hora!")
- summaryMarkdown: string (Estruturado em duas partes claras: '### 🧺 O que você vai precisar' com xícaras e gramas, e '### 👩‍🍳 Como fazer' com o passo a passo detalhado e truques da vovó)`;

    const response = await aiClient.models.generateContent({
      model: DOUGHCRAFT_MODEL,
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
      error: error.message || 'Erro ao preparar a receita.',
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
    console.log(`DoughCraft server listening on port ${port}`);
  });
}

startServer();
