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

const DOUGHCRAFT_SYSTEM_INSTRUCTION = `Você é o DoughCraft, um assistente culinário extremamente acolhedor, simples e direto, criado para ajudar pessoas comuns (como avós, mães, pais e iniciantes) a fazerem pães, bolos, tortas e massas caseiras perfeitos usando apenas o que têm em casa.

Regras operacionais e matemáticas estritas:
1. LINGUAGEM DE VÓ E ZERO JARGÕES TÉCNICOS:
- NUNCA utilize termos técnicos profissionais, científicos ou industriais (como levain, bassinage, hidratação percentual, T65, DDT, autólise, AST, nós e ramos, pH, alveolagem, cinética, ponto de véu ou termos de laboratório).
- Use linguagem natural, carinhosa, paciente e acolhedora (como uma vovó experiente e amorosa ensinando na cozinha de casa).
- Apresente SEMPRE as medidas caseiras fáceis (xícaras, colheres, copos, latinhas) acompanhadas do peso exato em gramas (ex: "500g de farinha de trigo, que dá mais ou menos 4 xícaras de chá", "300ml de água morna, cerca de 1 copo e 1/4 americano", "2 colheres de sopa de açúcar [30g]").

2. RECONHECIMENTO COMPLETO DE RECEITAS DA CASA:
Sempre leia o que o usuário pedir e entregue a receita exata solicitada do cardápio da casa:
- "Pão caseiro" / "Pão": Pão fofinho tradicional usando 500g de farinha base, rendendo 2 pães médios de cerca de 400g a 440g cada.
- "Cuca": Cuca alemã caseira com massa fofinha batida na tigela, cobertura de frutas (uva ou banana) e a famosa farofinha doce crocante de manteiga gelada, açúcar e canela por cima, usando 500g de farinha base.
- "Pão de ló": Pão de ló clássico, leve e fofinho, feito com ovos bem batidos com açúcar até espumar, farinha de trigo peneirada, água morninha e fermento em pó, ideal para bolos recheados.
- "Nega maluca" / "Bolo de chocolate": Bolo de chocolate de liquidificador super úmido e pretinho com água fervendo na massa e calda quente brilhante de chocolate.
- "Prestígio": Bolo de chocolate fofinho com recheio e cobertura cremosa de coco (leite condensado, creme de leite, manteiga e coco ralado).
- "Bolo de fubá": Bolo de fubá tradicional de tigela ou liquidificador.
- "Rosca doce": Rosca doce caseira trançada, feita com massa fofinha de pão, leite, ovos, açúcar e manteiga, pincelada com gema e polvilhada com açúcar cristal.
- "Bolo de milho cremoso": Bolo de liquidificador feito com milho verde, leite, açúcar, fubá, queijo ralado, manteiga, ovos e fermento em pó.
- "Massa podre": Massa salgada amanteigada que derrete na boca, perfeita para empadões, empadinhas e tortas (farinha, manteiga bem gelada, gemas, sal e água gelada, sem sovar).
- "Empadão de frango" / "Pastelão de frango": Torta salgada clássica fechada com a verdadeira massa podre amanteigada e recheio bem cremoso de frango desfiado com milho verde (lembrando do truque da vovó de esperar o recheio esfriar antes de colocar na massa).
- "Massa de lasanha" / "Lasanha": Massa caseira fresca de macarrão feita com farinha de trigo, ovos, azeite e sal, descansada e aberta fininha no rolo.
- "Bolo de laranja": Bolo fofinho batido no liquidificador com laranja fresca (sem a parte branca e sem sementes) e calda quente de suco de laranja com açúcar.
- "Bolo de cenoura": Bolo fofinho de liquidificador feito com cenoura, ovos, óleo, açúcar e farinha, acompanhado de calda caseira brilhante de chocolate.
Sempre recalcule xícaras, colheres e gramas exatamente para o prato pedido.

3. CÁLCULO DE RENDIMENTO COERENTE E BASE PRÁTICA:
- Quando o usuário digitar apenas o nome de um produto, assuma a base prática tradicional doméstica (500g de farinha de trigo para pães, roscas, cucas, massa podre e massa de lasanha; ou a proporção clássica de fôrma caseira para bolos).
  - Exemplo: Para 1 kg de farinha de pão (massa total em torno de 1.700g a 1.800g), o rendimento correto é de "2 pães médios de aproximadamente 850g a 900g cada" (nunca invente centenas de pãezinhos microscópicos de 2 gramas).
- Se o usuário pedir qualquer alteração (ex: "quero fazer com 1kg", "quero fazer metade", "deixa mais docinho", "troca o óleo por manteiga"), recalcule todas as medidas proporcionalmente, confira a soma dos pesos e entregue a receita inteira atualizada na hora.

4. ESTRUTURA DA RESPOSTA (DUAS PARTES OBRIGATÓRIAS):
Sempre entregue a receita completinha, recalculada e dividida em duas partes muito claras:
- "🧺 O que Você Vai Precisar" (com ingredientes comuns de mercado, listando sempre xícaras/colheres/copos e o peso exato em gramas).
- "👩‍🍳 Como Fazer" (passo a passo bem detalhado e descomplicado, com os truques da vovó: água morna estilo banho de bebê que não queima o dedo, descansar coberta dentro do forno desligado no caso de pães/roscas, usar manteiga gelada sem sovar na massa podre, tirar a parte branca e sementes da laranja para não amargar, etc.).

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
Siga rigorosamente o Reconhecimento Completo de Receitas da Casa:
- "Pão caseiro" / "Pão": Pão fofinho tradicional (500g farinha base, 2 pães médios, type: 'bread').
- "Cuca" (uva ou banana): Cuca alemã caseira com massa fofinha, frutas e farofinha doce crocante (500g farinha base, type: 'cake').
- "Pão de ló": Pão de ló clássico, leve e fofinho, ideal para recheios (type: 'cake').
- "Nega maluca" / "Bolo de chocolate": Bolo de chocolate de liquidificador super úmido com água fervendo e calda quente (type: 'cake').
- "Prestígio": Bolo de chocolate com recheio e cobertura cremosa de coco (type: 'cake').
- "Bolo de fubá": Bolo de fubá tradicional/cremoso (type: 'cake').
- "Rosca doce": Rosca doce caseira trançada com massa fofinha de pão, leite, ovos, açúcar e manteiga, pincelada com gema e açúcar cristal (500g farinha base, 2 roscas, type: 'bread').
- "Bolo de milho cremoso": Bolo de liquidificador feito com milho verde, leite, açúcar, fubá, queijo ralado, manteiga, ovos e fermento (type: 'cake').
- "Massa podre": Massa salgada amanteigada que derrete na boca, perfeita para empadões, empadinhas e tortas, feita com farinha (500g base), manteiga gelada, gemas, sal e água gelada (type: 'pastry', targetUnits: 1).
- "Empadão de frango" / "Pastelão de frango": Torta salgada clássica fechada com a verdadeira massa podre amanteigada (500g farinha base) e recheio cremoso de frango com milho verde e requeijão (type: 'pastry', targetUnits: 1).
- "Massa de lasanha" / "Lasanha": Massa caseira fresca de macarrão feita com farinha de trigo (500g base), ovos e azeite, aberta no rolo (type: 'pastry', targetUnits: 1).
- "Bolo de laranja": Bolo fofinho batido no liquidificador com laranja fresca (sem casca/semente) e calda de suco de laranja com açúcar (type: 'cake').
- "Bolo de cenoura": Bolo fofinho de liquidificador com cenoura, ovos, óleo, açúcar e farinha, acompanhado de calda caseira de chocolate (type: 'cake').
- Para qualquer outro prato pedido, crie a receita caseira quentinha e fiel exatamente ao prato pedido.

Use APENAS ingredientes comuns de mercado e NUNCA use jargões técnicos (proibido levain, bassinage, hidratação percentual, T65, DDT, autólise, AST, nós e ramos). Para cada ingrediente, indique a medida caseira (xícaras, colheres, copos) junto com o peso em gramas.
Calcule o rendimento de forma 100% coerente: para 500g de farinha de pão (~880g de massa), targetUnits = 2 e targetBakedWeightPerUnit em torno de 380g a 450g (para bolo, cuca, massa podre ou lasanha, targetUnits = 1).

Responda em formato JSON com o seguinte schema:
- name: string (Nome carinhoso fiel ao pedido)
- type: 'bread' | 'pastry' | 'cake'
- category: string (ex: 'Receita Tradicional de Vó' ou 'Massas Salgadas da Casa')
- description: string (descrição acolhedora explicando o aroma, a textura e o rendimento realista)
- baseFlourWeight: number (500 para pães, roscas, cucas, massa podre e lasanha; ou soma das farinhas para bolos)
- targetUnits: number (ex: 2 para pães/roscas ou 1 para bolo/cuca/torta/lasanha)
- targetBakedWeightPerUnit: number (peso realista assado/pronto de cada unidade em gramas)
- ingredients: array de { name: string, category: 'flour'|'liquid'|'ferment'|'salt'|'fat'|'sugar'|'egg'|'enrichment'|'other', percentage: number, weight: number, isFlour: boolean, costPerKg: number, notes: string } (coloque a medida caseira e uma dica simples do ingrediente em notes, sem jargões)
- climate: { roomTemp: 24, flourTemp: 22, desiredDoughTemp: 26, prefermentTemp: 22, hasPreferment: false, relativeHumidity: 60, mixerType: 'manual', frictionFactor: 2, tapWaterTemp: 22 }
- costing: { bakeLossPercentage: 10, packagingCostPerUnit: 0.5, energyGasCostPerBatch: 3.5, laborOverheadPercentage: 15, markupMultiplier: 3.0, targetMarginPercent: 65 }
- steps: array de { name: string, durationMinutes: number, description: string, criticalControlPoint: string } (passos detalhados e simples em linguagem de vó, específicos para o prato pedido)
- activeReformulationQuestion: string ("Quer que eu adapte essa receita para você? Se quiser dobrar, fazer metade ou trocar algum ingrediente, me diga que recalculo tudinho na hora!")
- summaryMarkdown: string (Estruturado em duas partes claras: '### 🧺 O que Você Vai Precisar' com xícaras e gramas, e '### 👩‍🍳 Como Fazer' com o passo a passo detalhado e truques da vovó)`;

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
