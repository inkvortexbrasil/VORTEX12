const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ensureMiniseriesWorkspace,
  formatSubjectTextReport,
  saveMiniseriesSubject,
  saveMiniseriesCaption,
  saveMiniseriesFlowMaster,
  saveMiniseriesGeminiMotions
} = require('../services/miniseries_workspace_service');

const sampleTopic = {
  title: 'Como a eletrofiação de nanofibras de celulose regenerada redefine a estamparia digital sem água em substratos híbridos',
  description: 'A integração de nanofibras de celulose regenerada obtidas por eletrofiação em matrizes têxteis híbridas estabelece um novo paradigma para a estamparia digital de alta resolução sem uso de água. Ao substituir banhos aquosos e fixadores químicos por uma malha eletrostática de escala nanométrica, o processo ancora pigmentos diretamente nas microfissuras da fibra através de forças intermoleculares controladas. Essa abordagem elimina completamente o efluente líquido tradicional, reduz o consumo térmico de cura e viabiliza estampas ultranítidas com resistência mecânica superior em tecidos mistos.',
  angle: 'Ancoragem eletrostática e física de pigmentos em malha nanométrica sem solventes aquosos.',
  centralQuestion: 'Por que a estamparia digital ainda precisa de água se a natureza tece sem ela?',
  editorialPromise: 'Compreender como a eletrofiação de celulose elimina 100% dos efluentes aquosos na estamparia têxtil.',
  technicalTruth: 'A adesão intermolecular por eletrofiação depende da viscosidade de solventes iônicos e campo eletrostático controlado.',
  why: 'A indústria gráfica e têxtil enfrenta restrições hídricas severas e necessita de alternativas de fixação a seco em escala industrial.',
  visualDirection: 'Cinematografia técnica e macroscópica em 16:9 widescreen, com iluminação clínica de laboratório e contraste de escala.',
  visualUniverse: {
    style: 'Hiper-realismo industrial e científico de vanguarda',
    coreSubject: 'Eletrofiação de celulose regenerada e ancoragem de pigmentos',
    materialsAndTextures: 'Nanofibras iridescentes, beéqueres de vidro com líquidos iônicos, tecidos híbridos e microgotas de tinta'
  },
  socialNarrative: {
    keyFacts: [
      'A estamparia têxtil convencional consome bilhões de litros de água por ano para fixação de cor.',
      'Nanofibras de celulose regenerada criam uma malha microscópica capaz de reter pigmentos a seco.',
      'O processo de eletrofiação aplica alta voltagem para gerar fios de espessura nanométrica.',
      'Líquidos iônicos de baixa toxicidade dissolvem a celulose sem degradar sua estrutura polimérica.',
      'O campo elétrico alinha as fibras diretamente sobre o tecido híbrido em movimento contínuo.',
      'Gotículas de tinta piezoelectricamente dosadas ancoram-se instantaneamente na malha.',
      'A fixação ocorre por forças de Van der Waals e entrelaçamento físico, dispensando lavagem posterior.',
      'O consumo energético global cai drasticamente pela eliminação dos fornos de secagem a vapor.',
      'A tecnologia InkVortex Brasil demonstra viabilidade em escala piloto com zero efluente líquido.',
      'Qual será o impacto dessa transição para os padrões industriais de sustentabilidade até 2030?'
    ],
    keywords: [
      'EletrofiacaoCelulose',
      'EstampariaSemAgua',
      'NanotecnologiaTextil',
      'InkVortexBrasil'
    ]
  },
  motionBlueprint: {
    actionVector: 'Jato de nanofibras em alta tensão espalha-se em leque cônico sobre o substrato têxtil em movimento linear contínuo.',
    dynamicElements: 'Feixes de luz LED azuis, microfios brilhantes em suspensão e rotação suave do tambor coletor.'
  },
  musicStoryArc: {
    beginning: 'Laboratório silencioso com tensão elétrica crescente e busca por fixação a seco.',
    turningPoint: 'Nanofibras formam a rede ideal e as cores se fixam com precisão matemática.',
    resolution: 'Máquinas industriais em velocidade máxima, tecidos estampados sem efluente e consagração tecnológica.'
  }
};

test('Workspace provisiona pasta assunto/ e persiste Genoma Central em .json e .txt formatado', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-persistence-'));
  const workspace = ensureMiniseriesWorkspace(root, 1);

  assert.equal(fs.existsSync(path.join(workspace.campaignRoot, 'assunto')), true);

  const saved = saveMiniseriesSubject(root, 1, sampleTopic);
  assert.equal(fs.existsSync(saved.jsonPath), true);
  assert.equal(fs.existsSync(saved.txtPath), true);

  const jsonContent = JSON.parse(fs.readFileSync(saved.jsonPath, 'utf8'));
  assert.equal(jsonContent.campaignNumber, '01');
  assert.equal(jsonContent.title, sampleTopic.title);
  assert.equal(jsonContent.topic.centralQuestion, sampleTopic.centralQuestion);
  assert.equal(jsonContent.topic.socialNarrative.keyFacts.length, 10);
  assert.equal(jsonContent.topic.visualUniverse.style, sampleTopic.visualUniverse.style);

  const txtContent = fs.readFileSync(saved.txtPath, 'utf8');
  assert.match(txtContent, /INKVORTEX BRASIL — GENOMA CENTRAL DO ASSUNTO/);
  assert.match(txtContent, /MINISSÉRIE #01/);
  assert.match(txtContent, /TÍTULO:\s+Como a eletrofiação/);
  assert.match(txtContent, /CONTEXTO MESTRE \(DESCRIPTION\):/);
  assert.match(txtContent, /PERGUNTA CENTRAL \(CENA 1\):\s+Por que a estamparia/);
  assert.match(txtContent, /1\. UNIVERSO VISUAL \(DIREÇÃO DE ARTE — SCENES 45 \/ SCENES 50\)/);
  assert.match(txtContent, /2\. NARRATIVA SOCIAL \(LEGENDA SOCIAL \/ CAPTION\)/);
  assert.match(txtContent, /01\. A estamparia têxtil convencional/);
  assert.match(txtContent, /10\. Qual será o impacto dessa transição/);
  assert.match(txtContent, /EletrofiacaoCelulose, EstampariaSemAgua/);
  assert.match(txtContent, /3\. BLUEPRINT DE MOVIMENTO \(FLOW MASTER & GEMINI MOTIONS\)/);
  assert.match(txtContent, /4\. ARCO NARRATIVO MUSICAL \(FLOW MUSIC\)/);
});

test('Persistência de Legenda Social em legendas/ com .json e .txt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-persistence-caption-'));
  const captionText = `Como a eletrofiação de nanofibras de celulose regenerada redefine a estamparia digital sem água em substratos híbridos

1. A estamparia têxtil convencional consome bilhões de litros de água por ano para fixação de cor.
2. Nanofibras de celulose regenerada criam uma malha microscópica capaz de reter pigmentos a seco.
3. O processo de eletrofiação aplica alta voltagem para gerar fios de espessura nanométrica.
4. Líquidos iônicos de baixa toxicidade dissolvem a celulose sem degradar sua estrutura polimérica.
5. O campo elétrico alinha as fibras diretamente sobre o tecido híbrido em movimento contínuo.
6. Gotículas de tinta piezoelectricamente dosadas ancoram-se instantaneamente na malha.
7. A fixação ocorre por forças de Van der Waals e entrelaçamento físico, dispensando lavagem posterior.
8. O consumo energético global cai drasticamente pela eliminação dos fornos de secagem a vapor.
9. A tecnologia InkVortex Brasil demonstra viabilidade em escala piloto com zero efluente líquido.
10. Qual será o impacto dessa transição para os padrões industriais de sustentabilidade até 2030?

Siga a InkVortex Brasil para mais inovações industriais.

#EletrofiacaoCelulose #EstampariaSemAgua #NanotecnologiaTextil #InkVortexBrasil`;

  const saved = saveMiniseriesCaption(root, '01', {
    campaignNumber: '01',
    title: sampleTopic.title,
    socialCaption: captionText
  });

  assert.equal(fs.existsSync(saved.jsonPath), true);
  assert.equal(fs.existsSync(saved.txtPath), true);

  const jsonContent = JSON.parse(fs.readFileSync(saved.jsonPath, 'utf8'));
  assert.equal(jsonContent.campaignNumber, '01');
  assert.equal(jsonContent.socialCaption, captionText);

  const txtContent = fs.readFileSync(saved.txtPath, 'utf8');
  assert.equal(txtContent, captionText);
});

test('Persistência de Flow Master em flow/ e Gemini Motions em prompts/', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-persistence-flow-'));

  const flowMasterData = {
    globalDirective: 'Câmera macro e cinemática com iluminação de bancada industrial.',
    scenes: [
      {
        number: 1,
        imageReference: 1,
        timeRange: '0:00 - 0:02',
        camera: 'Push-in lento',
        subjectMotion: 'Injeção de nanofibras',
        environmentMotion: 'Névoa suave de vapor',
        endFrame: 'Foco no ponto de contato',
        transition: 'Corte seco'
      }
    ],
    prompt: '[GLOBAL VIDEO DIRECTIVE]\nCâmera macro e cinemática...'
  };

  const savedFlow = saveMiniseriesFlowMaster(root, '01', flowMasterData);
  assert.equal(fs.existsSync(savedFlow.jsonPath), true);
  assert.equal(fs.existsSync(savedFlow.txtPath), true);

  const motionData = [
    { number: 1, motionPrompt: 'A slow macro push-in on electrospinning needle emitting cellulose nanofiber jet.' }
  ];

  const savedMotions = saveMiniseriesGeminiMotions(root, '01', {
    campaignNumber: '01',
    motionScenes: motionData
  });
  assert.equal(fs.existsSync(savedMotions.jsonPath), true);
  assert.equal(fs.existsSync(savedMotions.txtPath), true);
  const motionsTxt = fs.readFileSync(savedMotions.txtPath, 'utf8');
  assert.match(motionsTxt, /GEMINI MOVIMENTO #01/);
});
