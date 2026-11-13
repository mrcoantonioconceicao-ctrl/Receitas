import { TroubleshootingIssue } from '../types';

export const TROUBLESHOOTING_ISSUES: TroubleshootingIssue[] = [
  {
    id: 'pao-compacto-miolo-denso',
    title: 'Pão Pesado, Baixinho ou Massudo por Dentro',
    category: 'miolo',
    symptoms: [
      'O pão não cresceu bonito e ficou baixinho',
      'Miolo apertado, pesado na mão ou com cara de massa crua',
      'Ficou embatumado depois que esfriou',
    ],
    primaryRootCause: 'Faltou tempo para a massa crescer ou cortou o pão ainda muito quente.',
    chemicalBiologicalMechanism:
      'Quando a massa assa antes de dobrar de tamanho, não dá tempo de o fermento formar aquelas bolhinhas de ar que deixam o pão fofo. E se a gente corta o pão saindo fumaça do forno, o vapor de dentro esmaga o miolo mole e ele fica parecendo massa crua.',
    immediateFix:
      'Deixe o pão esfriar em cima de uma gradinha ou pano seco por pelo menos 40 minutinhos antes de fatiar.',
    preventiveAdjustment:
      'Tenha paciência no descanso! Cubra a tigela com um pano limpo e deixe dentro do forno desligado até dobrar de volume. Verifique se o fermento está na validade e se a água estava morninha (não quente demais).',
    technicalMetric: 'Sinal de pronto: massa fofinha que dobrou de tamanho antes de ir ao forno.',
  },
  {
    id: 'massa-nao-cresceu',
    title: 'A Massa Não Cresceu Nada na Tigela',
    category: 'fermentacao',
    symptoms: [
      'Passou 1 hora e a massa continuou do mesmo tamanhinho',
      'Massa pesada e fria ao toque',
      'Não fez espuminha quando misturou o fermento',
    ],
    primaryRootCause: 'Água quente demais queimou o fermento, ou a cozinha estava muito fria e com corrente de ar.',
    chemicalBiologicalMechanism:
      'O fermento biológico é um bichinho vivo bem sensível: água pelando (que queima o dedo) mata o fermento na hora. Já o vento frio deixa ele dormindo sem forças para fazer a massa subir.',
    immediateFix:
      'Aqueça levemente o forno por apenas 2 minutinhos, DESLIGUE o fogo, confira se está só morninho com a mão, e coloque a tigela coberta lá dentro por mais 45 minutos.',
    preventiveAdjustment:
      'Sempre teste a água ou o leite no pulso: tem que estar morninho como banho de bebê. Misture primeiro com o açúcar e espere 10 minutinhos espumar antes de jogar o sal e a farinha.',
    technicalMetric: 'Dica de vó: 5g de fermento seco (meio pacotinho) para cada 500g de farinha.',
  },
  {
    id: 'massa-grudenta-ou-dura',
    title: 'Massa Muito Grudenta na Mão ou Dura Demais',
    category: 'massa',
    symptoms: [
      'Massa cola inteira nos dedos e não desgruda da mesa',
      'Ou o contrário: massa seca, rachando e difícil de sovar',
    ],
    primaryRootCause: 'Falta ou excesso de farinha de trigo na hora da sova (cada marca de farinha absorve água de um jeito).',
    chemicalBiologicalMechanism:
      'Algumas farinhas são mais sequinhas e pedem um tiquinho a mais de água; outras são mais úmidas. Se jogar farinha demais de uma vez para parar de grudar, o pão fica duro e seco depois de assado.',
    immediateFix:
      'Se estiver grudenta, unte suas mãos com um fiozinho de óleo e sove batendo e dobrando por 5 minutinhos antes de polvilhar mais farinha. Se estiver dura e seca, molhe as pontas dos dedos em água morninha e vá sovando aos poucos.',
    preventiveAdjustment:
      'Coloque a farinha aos pouquinhos até dar ponto de massa macia que desgruda da tigela. Pão gostoso tem massa bem macia, levemente úmida, sem ser dura.',
    technicalMetric: 'Ponto certo: massa lisinha como bumbum de neném que não gruda na mão limpa.',
  },
  {
    id: 'casca-dura-ou-ressecada',
    title: 'Casca Muito Dura, Seca ou Quebradiça',
    category: 'casca',
    symptoms: [
      'Casca difícil de morder depois que o pão esfriou',
      'Pão ressecado por fora e sem brilho',
      'Casca rachou por baixo ou pelos lados',
    ],
    primaryRootCause: 'Forno fraco demais (demorou muito para assar) ou faltou passar manteiga/óleo na massa.',
    chemicalBiologicalMechanism:
      'Quando o forno está frio demais, o pão precisa ficar muito tempo lá dentro e acaba perdendo toda a umidade, formando uma casca grossa e dura.',
    immediateFix:
      'Pincele manteiga ou margarina derretida por cima da casca assim que sair do forno quentinho e cubra com um pano de prato limpo por 10 minutos para amaciar.',
    preventiveAdjustment:
      'Pré-aqueça bem o forno a 180°C antes de colocar a assadeira. Não deixe a massa descoberta pegando vento enquanto cresce (sempre cubra com pano de prato ou plástico).',
    technicalMetric: 'Forno médio a 180°C por 30 a 35 minutos até dourar bonito.',
  },
  {
    id: 'pao-cheiro-forte-fermento',
    title: 'Pão com Cheiro ou Gosto Forte de Fermento / Azedo',
    category: 'fermentacao',
    symptoms: [
      'Cheiro muito forte de fermento ao cortar o pão',
      'A massa cresceu demais e depois murchou no forno',
      'Sabor um pouco azedo',
    ],
    primaryRootCause: 'Fermento em excesso ou massa que cresceu tempo demais em dia muito quente.',
    chemicalBiologicalMechanism:
      'Em dias quentes de verão, a massa cresce muito rápido. Se passar do ponto e crescer demais, o fermento cansa, consome todo o açúcar e a massa murcha no forno deixando gosto forte.',
    immediateFix:
      'Sirva as fatias tostadinhas na frigideira com manteiga ou requeijão — o calor suaviza o aroma.',
    preventiveAdjustment:
      'Para 500g de farinha (2 pães), use apenas meio pacotinho de fermento seco (5g), ou 1 pacotinho inteiro (10g) só em dias bem frios. No verão, use água em temperatura ambiente ou fresquinha.',
    technicalMetric: 'Na hora de assar, o pão deve ter dobrado de tamanho, sem transbordar da fôrma.',
  },
  {
    id: 'teto-oco-buraco-em-cima',
    title: 'Buraco Grande Debaixo da Casca de Cima',
    category: 'miolo',
    symptoms: [
      'Um vão vazio enorme logo abaixo da casca superior',
      'A casca de cima solta quando vai passar manteiga',
      'Parte de baixo do pão fica mais apertada',
    ],
    primaryRootCause: 'Ficou ar preso ao enrolar o pão ou faltou fechar bem a pontinha do rocambole.',
    chemicalBiologicalMechanism:
      'Quando enrolamos a massa frouxa demais, ficam bolsas de ar grandes lá dentro. No calor do forno, esse ar incha rápido e empurra a casca de cima para longe do miolo.',
    immediateFix:
      'Na próxima modelagem, aperte levemente a massa com as mãos abertas ou passe o rolo para tirar todas as bolhas grandes de ar antes de enrolar.',
    preventiveAdjustment:
      'Enrole o pão bem firme e apertadinho feito rocambole e dê beliscões na emenda para selar bem antes de colocar na fôrma untada.',
    technicalMetric: 'Emenda da massa sempre virada para baixo na fôrma.',
  },
  {
    id: 'bolo-solado-embatumado',
    title: 'Bolo Solado / Pesado que Não Cresceu',
    category: 'bolo',
    symptoms: [
      'Bolo baixinho, pesado e parecendo pudim duro por dentro',
      'Listra escura e pesada no fundo da fôrma',
      'Massa sem furinhos fofos',
    ],
    primaryRootCause: 'Bateu demais a farinha de trigo ou usou fermento de bolo vencido.',
    chemicalBiologicalMechanism:
      'Se a gente bate a farinha de trigo no liquidificador ou na batedeira forte depois de pronta, a massa fica elástica igual pão e trava o crescimento do bolo, deixando ele pesado e solado.',
    immediateFix:
      'Bolo solado vira uma delícia esfarelado como pavê, bolo de pote ou brigadeiro de bolo! Teste o fermento colocando uma pitada em um copo com água: se borbulhar na hora, está ótimo.',
    preventiveAdjustment:
      'Bata no liquidificador só ovos, leite, óleo e açúcar. Despeje em uma tigela e misture a farinha e o fermento à mão, bem devagarzinho com uma colher, só até sumir a farinha branca.',
    technicalMetric: 'Regra de ouro: farinha e fermento de bolo sempre misturados à mão com delicadeza.',
  },
  {
    id: 'bolo-afundou-centro',
    title: 'Bolo Cresceu Lindo e Afundou no Meio',
    category: 'bolo',
    symptoms: [
      'Bolo subiu bonito no forno, mas fez um buraco no centro quando saiu',
      'Bordas altas e meio murcho e molhadinho',
    ],
    primaryRootCause: 'Abriu a porta do forno cedo demais ou colocou fermento químico em excesso.',
    chemicalBiologicalMechanism:
      'Antes de o meio do bolo firmar com o calor, o ar frio que entra quando abrimos o forno faz a massa murchar na hora. Fermento demais também faz crescer rápido demais e desabar depois.',
    immediateFix:
      'Cubra o meio afundado com uma calda quentinha de chocolate ou goiabada derretida — ninguém nem percebe e fica maravilhoso!',
    preventiveAdjustment:
      'Use exatamente 1 colher de sopa de fermento em pó (15g) para um bolo médio e NUNCA abra o forno nos primeiros 25 minutos de forno. Só faça o teste do palitinho quando sentir o cheirinho de bolo pronto pela casa.',
    technicalMetric: 'Espere pelo menos 25 a 30 minutos antes de abrir a portinha do forno.',
  },
];
