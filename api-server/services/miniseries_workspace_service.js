const fs = require('fs');
const path = require('path');
const { safeJoin } = require('../utils/security');

const MAX_CAMPAIGN_NUMBER = 9999;

function normalizeCampaignNumber(raw) {
  const value = String(raw ?? '').trim();
  if (!/^\d{1,4}$/.test(value)) {
    throw new Error('Número de minissérie inválido.');
  }
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > MAX_CAMPAIGN_NUMBER) {
    throw new Error('Número de minissérie fora do intervalo permitido.');
  }
  return String(numericValue).padStart(2, '0');
}

function getWorkspaceDirectories(root, rawCampaignNumber) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const relativeDirectories = [
    'assunto',
    'flow',
    'legendas',
    `M${campaignNumber}`,
    'prompts',
    path.join('sonoplastia', 'm4a'),
    path.join('sonoplastia', 'ass'),
    path.join('sonoplastia', 'mp4'),
    path.join('sonoplastia', 'flow-music')
  ];
  return {
    campaignNumber,
    campaignRoot,
    directories: relativeDirectories.map(relativePath => safeJoin(campaignRoot, relativePath))
  };
}

function formatSubjectTextReport(topic, rawCampaignNumber) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const t = topic || {};
  const title = String(t.title || `Minissérie #${campaignNumber}`).trim();
  const description = String(t.description || t.summary || '').trim();
  const angle = String(t.angle || '').trim();
  const centralQuestion = String(t.centralQuestion || '').trim();
  const editorialPromise = String(t.editorialPromise || '').trim();
  const technicalTruth = String(t.technicalTruth || '').trim();
  const why = String(t.why || '').trim();
  const visualDirection = String(t.visualDirection || '').trim();

  const vu = t.visualUniverse && typeof t.visualUniverse === 'object' ? t.visualUniverse : {};
  const sn = t.socialNarrative && typeof t.socialNarrative === 'object' ? t.socialNarrative : {};
  const mb = t.motionBlueprint && typeof t.motionBlueprint === 'object' ? t.motionBlueprint : {};
  const ma = t.musicStoryArc && typeof t.musicStoryArc === 'object' ? t.musicStoryArc : {};

  const lines = [
    '================================================================================',
    'INKVORTEX BRASIL — GENOMA CENTRAL DO ASSUNTO',
    `MINISSÉRIE #${campaignNumber}`,
    '================================================================================',
    '',
    'TÍTULO:',
    title,
    '',
    'CONTEXTO MESTRE (DESCRIPTION):',
    description || '(Não informado)',
    '',
    'ÂNGULO TÉCNICO (ANGLE):',
    angle || '(Não informado)',
    '',
    'PERGUNTA CENTRAL (CENA 1):',
    centralQuestion || '(Não informada)',
    '',
    'PROMESSA EDITORIAL:',
    editorialPromise || '(Não informada)',
    '',
    'VERDADE TÉCNICA:',
    technicalTruth || '(Não informada)',
    '',
    'JUSTIFICATIVA EDITORIAL (WHY):',
    why || '(Não informada)',
    '',
    'DIREÇÃO VISUAL GERAL:',
    visualDirection || '(Não informada)',
    '',
    '--------------------------------------------------------------------------------',
    '1. UNIVERSO VISUAL (DIREÇÃO DE ARTE — SCENES 45 / SCENES 50)',
    '--------------------------------------------------------------------------------',
    `- Estilo e Nível Tecnológico: ${vu.style || '(Não informado)'}`,
    `- Sujeito Central: ${vu.coreSubject || '(Não informado)'}`,
    `- Materiais e Texturas: ${vu.materialsAndTextures || '(Não informado)'}`,
    '',
    '--------------------------------------------------------------------------------',
    '2. NARRATIVA SOCIAL (LEGENDA SOCIAL / CAPTION)',
    '--------------------------------------------------------------------------------',
    'Fatos Técnicos Chave (Progressão das 10 Linhas):'
  ];

  if (Array.isArray(sn.keyFacts) && sn.keyFacts.length > 0) {
    sn.keyFacts.forEach((fact, idx) => {
      lines.push(`  ${String(idx + 1).padStart(2, '0')}. ${fact}`);
    });
  } else {
    lines.push('  (Fatos técnicos não estruturados)');
  }

  lines.push('');
  lines.push('Palavras-chave (Hashtags):');
  if (Array.isArray(sn.keywords) && sn.keywords.length > 0) {
    lines.push(`  ${sn.keywords.join(', ')}`);
  } else {
    lines.push('  (Palavras-chave não estruturadas)');
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('3. BLUEPRINT DE MOVIMENTO (FLOW MASTER & GEMINI MOTIONS)');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`- Vetor de Ação (10s): ${mb.actionVector || '(Não informado)'}`);
  lines.push(`- Elementos Dinâmicos: ${mb.dynamicElements || '(Não informado)'}`);

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('4. ARCO NARRATIVO MUSICAL (FLOW MUSIC)');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`- Início (Cenas 01–04): ${ma.beginning || '(Não informado)'}`);
  lines.push(`- Ponto de Virada (Cenas 05–08): ${ma.turningPoint || '(Não informado)'}`);
  lines.push(`- Resolução (Cenas 09–10): ${ma.resolution || '(Não informado)'}`);
  lines.push('================================================================================');

  return lines.join('\n');
}

function saveMiniseriesSubject(root, rawCampaignNumber, topic) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const assuntoDir = safeJoin(campaignRoot, 'assunto');
  fs.mkdirSync(assuntoDir, { recursive: true });

  const incoming = topic || {};
  const jsonPath = path.join(assuntoDir, `genoma_central_${campaignNumber}.json`);
  const txtPath = path.join(assuntoDir, `genoma_central_${campaignNumber}.txt`);

  let existingTopic = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (prev && prev.topic && typeof prev.topic === 'object') {
        existingTopic = prev.topic;
      }
    } catch (_) {}
  }

  const t = {
    ...existingTopic,
    ...incoming,
    visualUniverse: {
      ...(existingTopic.visualUniverse && typeof existingTopic.visualUniverse === 'object' ? existingTopic.visualUniverse : {}),
      ...(incoming.visualUniverse && typeof incoming.visualUniverse === 'object' ? incoming.visualUniverse : {})
    },
    socialNarrative: {
      ...(existingTopic.socialNarrative && typeof existingTopic.socialNarrative === 'object' ? existingTopic.socialNarrative : {}),
      ...(incoming.socialNarrative && typeof incoming.socialNarrative === 'object' ? incoming.socialNarrative : {})
    },
    motionBlueprint: {
      ...(existingTopic.motionBlueprint && typeof existingTopic.motionBlueprint === 'object' ? existingTopic.motionBlueprint : {}),
      ...(incoming.motionBlueprint && typeof incoming.motionBlueprint === 'object' ? incoming.motionBlueprint : {})
    },
    musicStoryArc: {
      ...(existingTopic.musicStoryArc && typeof existingTopic.musicStoryArc === 'object' ? existingTopic.musicStoryArc : {}),
      ...(incoming.musicStoryArc && typeof incoming.musicStoryArc === 'object' ? incoming.musicStoryArc : {})
    }
  };

  const structuredData = {
    campaignNumber,
    title: t.title || `Minissérie #${campaignNumber}`,
    topic: t,
    updatedAt: new Date().toISOString()
  };

  const textReport = formatSubjectTextReport(t, campaignNumber);

  fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2), 'utf8');
  fs.writeFileSync(txtPath, textReport, 'utf8');

  return { campaignNumber, jsonPath, txtPath };
}

function saveMiniseriesCaption(root, rawCampaignNumber, captionData) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const legendasDir = safeJoin(campaignRoot, 'legendas');
  fs.mkdirSync(legendasDir, { recursive: true });

  const data = typeof captionData === 'string' ? { socialCaption: captionData } : (captionData || {});
  const socialCaption = String(data.socialCaption || data.caption || '').trim();
  const title = String(data.title || `Minissérie #${campaignNumber}`).trim();

  const jsonPath = path.join(legendasDir, `legenda_social_${campaignNumber}.json`);
  const txtPath = path.join(legendasDir, `legenda_social_${campaignNumber}.txt`);

  const structuredData = {
    campaignNumber,
    title,
    socialCaption,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2), 'utf8');
  fs.writeFileSync(txtPath, socialCaption, 'utf8');

  return { campaignNumber, jsonPath, txtPath };
}

function saveMiniseriesFlowMaster(root, rawCampaignNumber, flowMasterData) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const flowDir = safeJoin(campaignRoot, 'flow');
  fs.mkdirSync(flowDir, { recursive: true });

  const data = flowMasterData || {};
  const prompt = String(data.prompt || '').trim();
  const globalDirective = String(data.globalDirective || '').trim();
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];

  const jsonPath = path.join(flowDir, `flow_master_prompts_${campaignNumber}.json`);
  const txtPath = path.join(flowDir, `flow_master_prompts_${campaignNumber}.txt`);

  const structuredData = {
    campaignNumber,
    globalDirective,
    scenes,
    prompt,
    updatedAt: new Date().toISOString()
  };

  const textContent = prompt || [
    `[GLOBAL VIDEO DIRECTIVE]`,
    globalDirective,
    '',
    `[TIMED SHOT PLAN]`,
    scenes.map(s => [
      `REFERENCE ${s.imageReference || s.number} -> SCENE ${s.number} | ${s.timeRange || ''}`,
      `Camera: ${s.camera || ''}`,
      `Subject motion: ${s.subjectMotion || ''}`,
      `Environmental motion: ${s.environmentMotion || ''}`,
      `End frame: ${s.endFrame || ''}`,
      `Transition: ${s.transition || ''}`
    ].join('\n')).join('\n\n')
  ].join('\n');

  fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2), 'utf8');
  fs.writeFileSync(txtPath, textContent, 'utf8');

  return { campaignNumber, jsonPath, txtPath };
}

function saveMiniseriesGeminiMotions(root, rawCampaignNumber, motionData) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const promptsDir = safeJoin(campaignRoot, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  const data = Array.isArray(motionData) ? { motionScenes: motionData } : (motionData || {});
  const motionScenes = Array.isArray(data.motionScenes) ? data.motionScenes : [];

  const prefix = String(motionScenes.length);
  const jsonPath = path.join(promptsDir, `${prefix}_prompts_gemini_motions_${campaignNumber}.json`);
  const txtPath = path.join(promptsDir, `${prefix}_prompts_gemini_motions_${campaignNumber}.txt`);

  const structuredData = {
    campaignNumber,
    motionScenes,
    updatedAt: new Date().toISOString()
  };

  const textContent = motionScenes.map(m => {
    return `GEMINI MOVIMENTO #${String(m.number).padStart(2, '0')}\nPrompt: ${m.motionPrompt || m.prompt || ''}`;
  }).join('\n\n----------------------------------------\n\n');

  fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2), 'utf8');
  fs.writeFileSync(txtPath, textContent, 'utf8');

  // Grava também 5_prompts_gemini_motions_ para compatibilidade com testes e fluxos legados
  if (prefix !== '5') {
    const jsonPathCompat = path.join(promptsDir, `5_prompts_gemini_motions_${campaignNumber}.json`);
    const txtPathCompat = path.join(promptsDir, `5_prompts_gemini_motions_${campaignNumber}.txt`);
    try {
      fs.writeFileSync(jsonPathCompat, JSON.stringify(structuredData, null, 2), 'utf8');
      fs.writeFileSync(txtPathCompat, textContent, 'utf8');
    } catch (_) {}
  }

  return { campaignNumber, jsonPath, txtPath };
}

function saveMiniseriesGptScenes(root, rawCampaignNumber, gptScenes) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const promptsDir = safeJoin(campaignRoot, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  const rawScenes = Array.isArray(gptScenes) ? gptScenes : (gptScenes && Array.isArray(gptScenes.scenes) ? gptScenes.scenes : []);
  if (!rawScenes || rawScenes.length === 0) return null;

  const normalized = rawScenes.map((scene, idx) => {
    const sceneIndex = idx + 1;
    const sceneNum = String(sceneIndex).padStart(2, '0');
    const rawTitle = String(scene.titleExact || scene.title || scene.headlineText || '').trim();
    const promptText = String(scene.assembledPrompt || scene.fullPrompt || scene.imagePrompt || scene.visualPrompt || scene.prompt || scene.gptPrompt || '').trim();
    return {
      sequence: 0,
      finalSequence: 0,
      source: 'gpt',
      type: 'gpt',
      sceneNum,
      gptSceneRef: sceneIndex,
      block: sceneIndex,
      positionInBlock: 1,
      title: rawTitle,
      fullPrompt: promptText,
      geminiMotion: scene.geminiMotion || '',
      caption: scene.caption || ''
    };
  });

  const jsonPath = path.join(promptsDir, `10_prompts_gpt_${campaignNumber}.json`);
  const txtPath = path.join(promptsDir, `10_prompts_gpt_${campaignNumber}.txt`);

  const txtContent = normalized.map(s => {
    let header = `IMAGEM #${s.sceneNum} [FONTE GPT] [BLOCO ${s.block}]`;
    if (s.title) header += `\nTITLE EXACT: "${s.title}"`;
    return `${header}\nPrompt: ${s.fullPrompt}\n`;
  }).join('\n----------------------------------------\n\n');

  fs.writeFileSync(jsonPath, JSON.stringify(normalized, null, 2), 'utf8');
  fs.writeFileSync(txtPath, txtContent, 'utf8');

  return { campaignNumber, jsonPath, txtPath, count: normalized.length };
}

function saveMiniseriesComplementaryScenes(root, rawCampaignNumber, compScenes) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const promptsDir = safeJoin(campaignRoot, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  const rawScenes = Array.isArray(compScenes) ? compScenes : (compScenes && Array.isArray(compScenes.scenes) ? compScenes.scenes : []);
  if (!rawScenes || rawScenes.length === 0) return null;

  const normalized = rawScenes.map((s, idx) => {
    const index = s.index || (idx + 1);
    const gptSceneRef = s.gptSceneRef || (Math.floor(idx / 4) + 1);
    const block = s.block || gptSceneRef;
    const positionInBlock = s.positionInBlock || ((idx % 4) + 2);
    const prompt = String(s.prompt || s.fullPrompt || s.imagePrompt || '').trim();
    return {
      index,
      source: 'complementary',
      type: 'complementary',
      gptSceneRef,
      block,
      positionInBlock,
      prompt
    };
  });

  const jsonPath = path.join(promptsDir, `40_prompts_complementares.json`);
  const txtPath = path.join(promptsDir, `40_prompts_complementares_minisserie_${campaignNumber}.txt`);

  const txtContent = normalized.map(s =>
    `IMAGEM COMPLEMENTAR #${String(s.index).padStart(2, '0')} [GPT CENA ${s.gptSceneRef}] [BLOCO ${s.block}] [POSIÇÃO ${s.positionInBlock}]\nPrompt: ${s.prompt}\n`
  ).join('\n----------------------------------------\n\n');

  fs.writeFileSync(jsonPath, JSON.stringify(normalized, null, 2), 'utf8');
  fs.writeFileSync(txtPath, txtContent, 'utf8');

  return { campaignNumber, jsonPath, txtPath, count: normalized.length };
}

function saveMiniseriesQueue50(root, rawCampaignNumber, queue50) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const promptsDir = safeJoin(campaignRoot, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  const rawQueue = Array.isArray(queue50) ? queue50 : (queue50 && Array.isArray(queue50.queue) ? queue50.queue : []);
  if (!rawQueue || rawQueue.length === 0) return null;

  const jsonPath = path.join(promptsDir, `50_prompts_esteira_chatgpt_${campaignNumber}.json`);
  const txtPath = path.join(promptsDir, `50_prompts_esteira_chatgpt_${campaignNumber}.txt`);

  const txtContent = rawQueue.map(item => {
    const seq = String(item.finalSequence || item.sequence || 0).padStart(2, '0');
    const sourceLabel = item.source === 'gpt' ? `[GPT CENA ${item.gptSceneRef}]` : `[COMPLEMENTAR ${item.gptSceneRef}.${item.positionInBlock}]`;
    const prompt = item.fullPrompt || item.prompt || '';
    return `POSIÇÃO #${seq} ${sourceLabel} [BLOCO ${item.block}]\nPrompt: ${prompt}\n`;
  }).join('\n========================================\n\n');

  fs.writeFileSync(jsonPath, JSON.stringify(rawQueue, null, 2), 'utf8');
  fs.writeFileSync(txtPath, txtContent, 'utf8');

  return { campaignNumber, jsonPath, txtPath, count: rawQueue.length };
}

function saveMiniseriesFlowMusic(root, rawCampaignNumber, flowMusicData) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const musicDir = safeJoin(campaignRoot, 'sonoplastia', 'flow-music');
  fs.mkdirSync(musicDir, { recursive: true });

  if (!flowMusicData) return null;

  let lyrics = '';
  let musicalComposition = '';
  let negativePrompt = '';
  let voice = '';
  let promptText = '';

  if (typeof flowMusicData === 'string') {
    promptText = flowMusicData;
  } else {
    lyrics = flowMusicData.lyrics || '';
    musicalComposition = flowMusicData.musicalComposition || flowMusicData.composition || '';
    negativePrompt = flowMusicData.negativePrompt || flowMusicData.exclude || '';
    voice = flowMusicData.voice || '';
    if (flowMusicData.prompt) {
      promptText = flowMusicData.prompt;
    } else {
      const parts = [];
      if (musicalComposition) parts.push(`[STYLE / MUSICAL COMPOSITION]\n${musicalComposition}`);
      if (negativePrompt) parts.push(`[EXCLUDE / NEGATIVE PROMPT]\n${negativePrompt}`);
      if (lyrics) parts.push(`[LYRICS]\n${lyrics}`);
      if (voice) parts.push(`[VOICE]\n${voice}`);
      promptText = parts.join('\n\n');
    }
  }

  const txtPath = path.join(musicDir, `FLOW MUSIC - #${campaignNumber}.txt`);
  const jsonPath = path.join(musicDir, `FLOW_MUSIC_${campaignNumber}.json`);

  fs.writeFileSync(txtPath, promptText, 'utf8');

  const structured = {
    campaignNumber,
    lyrics,
    musicalComposition,
    negativePrompt,
    voice,
    prompt: promptText,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(jsonPath, JSON.stringify(structured, null, 2), 'utf8');

  return { campaignNumber, txtPath, jsonPath };
}

function saveFullMiniseriesCampaign(root, campaign) {
  if (!campaign) return { ok: false, error: 'Dados da campanha ausentes' };
  const rawNumber = campaign.number || campaign.cNum || campaign.campaignNumber || 1;
  const campaignNumber = normalizeCampaignNumber(rawNumber);

  ensureMiniseriesWorkspace(root, campaignNumber);
  const savedArtifacts = [];

  // 1. Assunto / Genoma Central
  const topic = campaign.subject || campaign.topic;
  if (topic && (topic.title || topic.description || topic.groupSubject)) {
    try {
      const res = saveMiniseriesSubject(root, campaignNumber, topic);
      savedArtifacts.push({ type: 'subject', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar assunto #${campaignNumber}:`, e.message);
    }
  }

  // 2. 10 Prompts GPT
  const gptScenes = campaign.scenes || campaign.gptScenes;
  if (Array.isArray(gptScenes) && gptScenes.length > 0) {
    try {
      const res = saveMiniseriesGptScenes(root, campaignNumber, gptScenes);
      if (res) savedArtifacts.push({ type: 'gpt_scenes', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar prompts GPT #${campaignNumber}:`, e.message);
    }
  }

  // 3. 40 Prompts Complementares
  const compScenes = campaign.scenes40 || campaign.complementaryScenes;
  if (Array.isArray(compScenes) && compScenes.length > 0) {
    try {
      const res = saveMiniseriesComplementaryScenes(root, campaignNumber, compScenes);
      if (res) savedArtifacts.push({ type: 'complementary_scenes', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar prompts complementares #${campaignNumber}:`, e.message);
    }
  }

  // 4. 50 Prompts da Esteira
  const queue50 = campaign.scenes50 || campaign.docScenes || campaign.queue50;
  if (Array.isArray(queue50) && queue50.length > 0) {
    try {
      const res = saveMiniseriesQueue50(root, campaignNumber, queue50);
      if (res) savedArtifacts.push({ type: 'queue50', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar esteira 50 #${campaignNumber}:`, e.message);
    }
  }

  // 5. Gemini Motions
  const geminiScenes = campaign.geminiScenes || campaign.motionScenes || campaign.geminiMotions;
  if (geminiScenes && (Array.isArray(geminiScenes) ? geminiScenes.length > 0 : Array.isArray(geminiScenes.motionScenes))) {
    try {
      const res = saveMiniseriesGeminiMotions(root, campaignNumber, geminiScenes);
      if (res) savedArtifacts.push({ type: 'gemini_motions', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar gemini motions #${campaignNumber}:`, e.message);
    }
  }

  // 6. Flow Master
  const flow = campaign.flow || campaign.flowMaster;
  if (flow && (flow.scenes || flow.prompt || flow.globalDirective)) {
    try {
      const res = saveMiniseriesFlowMaster(root, campaignNumber, flow);
      if (res) savedArtifacts.push({ type: 'flow_master', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar flow master #${campaignNumber}:`, e.message);
    }
  }

  // 7. Legenda Social
  const social = campaign.social || campaign.caption;
  if (social && (typeof social === 'string' || social.socialCaption || social.caption)) {
    try {
      const res = saveMiniseriesCaption(root, campaignNumber, typeof social === 'string' ? { socialCaption: social } : social);
      if (res) savedArtifacts.push({ type: 'caption', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar legenda #${campaignNumber}:`, e.message);
    }
  }

  // 8. Flow Music / Sonoplastia
  const flowMusic = campaign.flowMusic || campaign.audioPrompt;
  if (flowMusic) {
    try {
      const res = saveMiniseriesFlowMusic(root, campaignNumber, flowMusic);
      if (res) savedArtifacts.push({ type: 'flow_music', ...res });
    } catch (e) {
      console.warn(`[Workspace] Erro ao salvar flow music #${campaignNumber}:`, e.message);
    }
  }

  return { ok: true, campaignNumber, savedArtifacts };
}

function restoreFullBackup(root, backupData) {
  if (!backupData) {
    throw new Error('Payload de backup vazio ou inválido.');
  }

  const rawCampaigns = Array.isArray(backupData)
    ? backupData
    : (Array.isArray(backupData.campaigns) ? backupData.campaigns : []);

  const results = [];
  for (const campaign of rawCampaigns) {
    const res = saveFullMiniseriesCampaign(root, campaign);
    results.push(res);
  }

  return {
    ok: true,
    restoredCount: rawCampaigns.length,
    version: backupData.version || '12.0',
    results
  };
}

function readPhysicalCampaignWorkspace(root, rawCampaignNumber) {
  const cNum = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', cNum);
  if (!fs.existsSync(campaignRoot)) {
    return { ok: false, exists: false, campaignNumber: cNum, campaign: null };
  }

  const campaign = {
    number: cNum,
    cNum,
    id: 'camp_' + cNum,
    scenes: [],
    scenes40: [],
    scenes50: [],
    geminiScenes: [],
    flow: null,
    social: null,
    flowMusic: null,
    subject: null,
    topic: null,
    title: '',
    assuntoPrincipal: '',
    generatedGPT: false,
    generatedGemini: false,
    generatedSocial: false,
    generatedFlow: false
  };

  // 1. Assunto / Genoma Central
  const subjectJson = path.join(campaignRoot, 'assunto', `genoma_central_${cNum}.json`);
  const subjectTxt = path.join(campaignRoot, 'assunto', `genoma_central_${cNum}.txt`);
  if (fs.existsSync(subjectJson)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(subjectJson, 'utf8'));
      campaign.subject = parsed.topic || parsed;
      campaign.topic = parsed.topic || parsed;
      campaign.title = parsed.title || parsed.topic?.title || parsed.assuntoPrincipal || '';
      campaign.assuntoPrincipal = campaign.title;
    } catch (_) {}
  } else if (fs.existsSync(subjectTxt)) {
    try {
      const txt = fs.readFileSync(subjectTxt, 'utf8');
      campaign.subject = { text: txt };
      campaign.topic = { text: txt };
    } catch (_) {}
  }

  // 2. 10 Prompts GPT
  const gptJson = path.join(campaignRoot, 'prompts', `10_prompts_gpt_${cNum}.json`);
  if (fs.existsSync(gptJson)) {
    try {
      const parsedGpt = JSON.parse(fs.readFileSync(gptJson, 'utf8'));
      if (Array.isArray(parsedGpt)) {
        campaign.scenes = parsedGpt.map((s, idx) => ({
          no: s.sceneNum ? Number(s.sceneNum) : (s.no || idx + 1),
          title: s.title || '',
          prompt: s.fullPrompt || s.prompt || s.assembledPrompt || '',
          assembledPrompt: s.assembledPrompt || s.fullPrompt || s.prompt || '',
          ...s
        }));
        if (campaign.scenes.length > 0) campaign.generatedGPT = true;
      }
    } catch (_) {}
  }

  // 3. 40 Prompts Complementares
  const compJson = path.join(campaignRoot, 'prompts', '40_prompts_complementares.json');
  if (fs.existsSync(compJson)) {
    try {
      const parsedComp = JSON.parse(fs.readFileSync(compJson, 'utf8'));
      if (Array.isArray(parsedComp)) {
        campaign.scenes40 = parsedComp.map((s, idx) => ({
          no: s.no || idx + 11,
          prompt: s.fullPrompt || s.prompt || '',
          assembledPrompt: s.assembledPrompt || s.fullPrompt || s.prompt || '',
          ...s
        }));
      }
    } catch (_) {}
  }

  // 4. 50 Prompts da Esteira
  const queueJson = path.join(campaignRoot, 'prompts', `50_prompts_esteira_chatgpt_${cNum}.json`);
  if (fs.existsSync(queueJson)) {
    try {
      const parsed50 = JSON.parse(fs.readFileSync(queueJson, 'utf8'));
      if (Array.isArray(parsed50)) {
        campaign.scenes50 = parsed50.map((s, idx) => ({
          no: s.no || idx + 1,
          prompt: s.fullPrompt || s.prompt || '',
          assembledPrompt: s.assembledPrompt || s.fullPrompt || s.prompt || '',
          ...s
        }));
      }
    } catch (_) {}
  }

  // 5. Gemini Motions
  const geminiJson7 = path.join(campaignRoot, 'prompts', `7_prompts_gemini_motions_${cNum}.json`);
  const geminiJson10 = path.join(campaignRoot, 'prompts', `10_prompts_gemini_motions_${cNum}.json`);
  const geminiJson5 = path.join(campaignRoot, 'prompts', `5_prompts_gemini_motions_${cNum}.json`);
  const geminiJson = fs.existsSync(geminiJson7) ? geminiJson7 : (fs.existsSync(geminiJson10) ? geminiJson10 : geminiJson5);
  if (fs.existsSync(geminiJson)) {
    try {
      const parsedGem = JSON.parse(fs.readFileSync(geminiJson, 'utf8'));
      const rawList = parsedGem.motionScenes || parsedGem;
      if (Array.isArray(rawList)) {
        campaign.geminiScenes = rawList.map((s, idx) => ({
          no: s.sceneNumber ? Number(s.sceneNumber) : (s.no || idx + 1),
          prompt: s.prompt || s.fullPrompt || '',
          assembledPrompt: s.assembledPrompt || s.prompt || s.fullPrompt || '',
          ...s
        }));
        if (campaign.geminiScenes.length > 0) campaign.generatedGemini = true;
      }
    } catch (_) {}
  }

  // 6. Flow Master
  const flowJson = path.join(campaignRoot, 'flow', `flow_master_prompts_${cNum}.json`);
  if (fs.existsSync(flowJson)) {
    try {
      const parsedFlow = JSON.parse(fs.readFileSync(flowJson, 'utf8'));
      campaign.flow = {
        prompt: parsedFlow.prompt || (parsedFlow.flow && parsedFlow.flow.prompt) || '',
        ...parsedFlow
      };
      if (campaign.flow.prompt || campaign.flow.scenes) campaign.generatedFlow = true;
    } catch (_) {}
  }

  // 7. Legenda Social
  const socialJson = path.join(campaignRoot, 'legendas', `legenda_social_${cNum}.json`);
  if (fs.existsSync(socialJson)) {
    try {
      const parsedSocial = JSON.parse(fs.readFileSync(socialJson, 'utf8'));
      campaign.social = {
        caption: parsedSocial.socialCaption || parsedSocial.caption || '',
        socialCaption: parsedSocial.socialCaption || parsedSocial.caption || '',
        ...parsedSocial
      };
      if (campaign.social.caption) campaign.generatedSocial = true;
    } catch (_) {}
  }

  // 8. Flow Music / Sonoplastia
  const musicDir = path.join(campaignRoot, 'sonoplastia', 'flow-music');
  campaign.flowMusicVersions = [];
  campaign.flowMusic = null;

  if (fs.existsSync(musicDir)) {
    try {
      const allFiles = fs.readdirSync(musicDir);
      const jsonFiles = allFiles
        .filter(f => f.toLowerCase().endsWith('.json') && !/^flow_music_\d+\.json$/i.test(f))
        .sort((a, b) => {
          try {
            const sA = fs.statSync(path.join(musicDir, a)).mtimeMs;
            const sB = fs.statSync(path.join(musicDir, b)).mtimeMs;
            return sB - sA;
          } catch (_) { return 0; }
        });

      for (const jf of jsonFiles) {
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(musicDir, jf), 'utf8'));
          campaign.flowMusicVersions.push({
            file: jf,
            title: path.basename(jf, '.json'),
            ...parsed
          });
        } catch (_) {}
      }

      if (campaign.flowMusicVersions.length > 0) {
        campaign.flowMusic = campaign.flowMusicVersions[0];
      } else {
        const txtFiles = allFiles.filter(f => f.toLowerCase().endsWith('.txt'));
        if (txtFiles.length > 0) {
          const firstTxt = path.join(musicDir, txtFiles[0]);
          campaign.flowMusic = { prompt: fs.readFileSync(firstTxt, 'utf8') };
        }
      }
    } catch (_) {}
  }

  // 9. Imagens em M<NN>
  const imagesDir = path.join(campaignRoot, 'M' + cNum);
  let imageFiles = [];
  if (fs.existsSync(imagesDir)) {
    try {
      imageFiles = fs.readdirSync(imagesDir).filter(f => /^img_\d+\.(?:jpe?g|png|webp)$/i.test(f));
    } catch (_) {}
  }
  campaign.imagesCount = imageFiles.length;

  return { ok: true, exists: true, campaignNumber: cNum, campaign };
}

function exportFullBackup(root, clientCampaigns) {
  const campaigns = Array.isArray(clientCampaigns) ? clientCampaigns : [];

  const enrichedCampaigns = campaigns.map(camp => {
    const cNum = normalizeCampaignNumber(camp.number || camp.cNum || 1);
    const campaignRoot = safeJoin(root, 'minisseries', cNum);
    const enriched = { ...camp, number: cNum, cNum };

    // Assunto / Genoma Central
    if (!enriched.subject && !enriched.topic) {
      const subjectJson = path.join(campaignRoot, 'assunto', `genoma_central_${cNum}.json`);
      if (fs.existsSync(subjectJson)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(subjectJson, 'utf8'));
          enriched.subject = parsed.topic || parsed;
        } catch (_) {}
      }
    }

    // 10 Prompts GPT
    if (!enriched.scenes || enriched.scenes.length === 0) {
      const gptJson = path.join(campaignRoot, 'prompts', `10_prompts_gpt_${cNum}.json`);
      if (fs.existsSync(gptJson)) {
        try {
          enriched.scenes = JSON.parse(fs.readFileSync(gptJson, 'utf8'));
        } catch (_) {}
      }
    }

    // 40 Prompts Complementares
    if (!enriched.scenes40 && !enriched.complementaryScenes) {
      const compJson = path.join(campaignRoot, 'prompts', '40_prompts_complementares.json');
      if (fs.existsSync(compJson)) {
        try {
          enriched.scenes40 = JSON.parse(fs.readFileSync(compJson, 'utf8'));
        } catch (_) {}
      }
    }

    // 50 Prompts da Esteira
    if (!enriched.scenes50 && !enriched.docScenes) {
      const queueJson = path.join(campaignRoot, 'prompts', `50_prompts_esteira_chatgpt_${cNum}.json`);
      if (fs.existsSync(queueJson)) {
        try {
          enriched.scenes50 = JSON.parse(fs.readFileSync(queueJson, 'utf8'));
        } catch (_) {}
      }
    }

    // Gemini Motions
    if (!enriched.geminiScenes) {
      const geminiJson7 = path.join(campaignRoot, 'prompts', `7_prompts_gemini_motions_${cNum}.json`);
      const geminiJson10 = path.join(campaignRoot, 'prompts', `10_prompts_gemini_motions_${cNum}.json`);
      const geminiJson5 = path.join(campaignRoot, 'prompts', `5_prompts_gemini_motions_${cNum}.json`);
      const geminiJson = fs.existsSync(geminiJson7) ? geminiJson7 : (fs.existsSync(geminiJson10) ? geminiJson10 : geminiJson5);
      if (fs.existsSync(geminiJson)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(geminiJson, 'utf8'));
          enriched.geminiScenes = parsed.motionScenes || parsed;
        } catch (_) {}
      }
    }

    // Flow Master
    if (!enriched.flow) {
      const flowJson = path.join(campaignRoot, 'flow', `flow_master_prompts_${cNum}.json`);
      if (fs.existsSync(flowJson)) {
        try {
          enriched.flow = JSON.parse(fs.readFileSync(flowJson, 'utf8'));
        } catch (_) {}
      }
    }

    // Legenda Social
    if (!enriched.social) {
      const socialJson = path.join(campaignRoot, 'legendas', `legenda_social_${cNum}.json`);
      if (fs.existsSync(socialJson)) {
        try {
          enriched.social = JSON.parse(fs.readFileSync(socialJson, 'utf8'));
        } catch (_) {}
      }
    }

    // Flow Music
    if (!enriched.flowMusic) {
      const musicDir = path.join(campaignRoot, 'sonoplastia', 'flow-music');
      if (fs.existsSync(musicDir)) {
        try {
          const allFiles = fs.readdirSync(musicDir);
          const jsonFiles = allFiles
            .filter(f => f.toLowerCase().endsWith('.json') && !/^flow_music_\d+\.json$/i.test(f))
            .sort((a, b) => {
              try {
                const sA = fs.statSync(path.join(musicDir, a)).mtimeMs;
                const sB = fs.statSync(path.join(musicDir, b)).mtimeMs;
                return sB - sA;
              } catch (_) { return 0; }
            });
          if (jsonFiles.length > 0) {
            enriched.flowMusic = JSON.parse(fs.readFileSync(path.join(musicDir, jsonFiles[0]), 'utf8'));
          } else {
            const txtFiles = allFiles.filter(f => f.toLowerCase().endsWith('.txt'));
            if (txtFiles.length > 0) {
              enriched.flowMusic = { prompt: fs.readFileSync(path.join(musicDir, txtFiles[0]), 'utf8') };
            }
          }
        } catch (_) {}
      }
    }

    return enriched;
  });

  return {
    systemName: 'InkVortex Brasil VORTEX 12.0',
    version: '12.0',
    timestamp: new Date().toISOString(),
    campaignsCount: enrichedCampaigns.length,
    campaigns: enrichedCampaigns
  };
}

function saveOfficialBackupToRoot(codeRoot, filesRoot, clientCampaigns = [], extraMeta = {}, options = {}) {
  const isPreReset = !!options.isPreReset;
  const backupData = exportFullBackup(filesRoot, clientCampaigns);
  
  if (extraMeta && typeof extraMeta === 'object') {
    if (extraMeta.activeStage) backupData.activeStage = extraMeta.activeStage;
    if (extraMeta.activeSubTab) backupData.activeSubTab = extraMeta.activeSubTab;
    if (extraMeta.selectedCampaignId) backupData.selectedCampaignId = extraMeta.selectedCampaignId;
    if (extraMeta.mistralKey) backupData.mistralKey = extraMeta.mistralKey;
    if (Array.isArray(extraMeta.suggestedSubjects)) backupData.suggestedSubjects = extraMeta.suggestedSubjects;
  }
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const prefix = isPreReset ? 'VORTEX12-BACKUP-PRE-RESET' : 'VORTEX12-BACKUP-OFICIAL';
  const fileName = `${prefix}-${dateStr}.json`;
  const filePath = path.join(codeRoot, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
  
  return {
    ok: true,
    success: true,
    fileName,
    filePath,
    dateStr,
    timestamp: backupData.timestamp,
    campaignsCount: backupData.campaignsCount,
    backupData
  };
}

function findLatestBackupInRoot(codeRoot) {
  if (!fs.existsSync(codeRoot)) return null;
  const files = fs.readdirSync(codeRoot);
  const candidates = [];

  for (const f of files) {
    if (!f.toLowerCase().endsWith('.json')) continue;
    const lower = f.toLowerCase();
    
    if (
      lower === 'package.json' ||
      lower === 'package-lock.json' ||
      lower === 'manifest.json' ||
      lower === 'tsconfig.json' ||
      lower === 'jsconfig.json'
    ) {
      continue;
    }

    if (lower.includes('backup') || (lower.startsWith('vortex') && lower.endsWith('.json'))) {
      const fullPath = path.join(codeRoot, f);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;

        const match = f.match(/(\d{4})[-_\s]?(\d{2})[-_\s]?(\d{2})/);
        let dateScore = 0;
        if (match) {
          const y = parseInt(match[1], 10);
          const m = parseInt(match[2], 10) - 1;
          const d = parseInt(match[3], 10);
          dateScore = new Date(y, m, d).getTime();
        }

        candidates.push({
          fileName: f,
          filePath: fullPath,
          mtimeMs: stat.mtimeMs,
          mtime: stat.mtime,
          dateScore
        });
      } catch (_) {}
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.dateScore && b.dateScore && b.dateScore !== a.dateScore) {
      return b.dateScore - a.dateScore;
    }
    return b.mtimeMs - a.mtimeMs;
  });

  for (const cand of candidates) {
    try {
      const content = fs.readFileSync(cand.filePath, 'utf8');
      const parsed = JSON.parse(content);
      return {
        fileName: cand.fileName,
        filePath: cand.filePath,
        mtime: cand.mtime,
        backupData: parsed
      };
    } catch (err) {
      console.warn(`[Backup] Arquivo corrompido ou ilegível ignorado: ${cand.fileName}`, err);
    }
  }

  return null;
}

function restoreLatestBackupFromRoot(codeRoot, filesRoot) {
  const latest = findLatestBackupInRoot(codeRoot);
  if (!latest) {
    throw new Error(`Nenhum arquivo de backup oficial VORTEX 12.0 foi encontrado na pasta raiz ${codeRoot}.`);
  }
  const result = restoreFullBackup(filesRoot, latest.backupData);
  return {
    ok: true,
    success: true,
    fileName: latest.fileName,
    filePath: latest.filePath,
    mtime: latest.mtime,
    restoredCount: result.restoredCount,
    version: result.version,
    backupData: latest.backupData,
    results: result.results
  };
}

function ensureMiniseriesWorkspace(root, rawCampaignNumber) {
  const workspace = getWorkspaceDirectories(root, rawCampaignNumber);
  workspace.directories.forEach(directory => fs.mkdirSync(directory, { recursive: true }));
  return workspace;
}

function matchesCampaignPrefix(fileName, campaignNumber) {
  const match = String(fileName).match(/^(\d+)(?=\D|$)/);
  return !!match && Number(match[1]) === Number(campaignNumber);
}

function deleteMiniseriesWorkspace(root, rawCampaignNumber) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const campaignRoot = safeJoin(root, 'minisseries', campaignNumber);
  const videoSocialRoot = safeJoin(root, 'minisseries', 'video social');
  const removed = [];

  if (fs.existsSync(campaignRoot)) {
    fs.rmSync(campaignRoot, { recursive: true, force: true });
    removed.push(campaignRoot);
  }

  if (fs.existsSync(videoSocialRoot)) {
    const directoryNames = new Set([campaignNumber, String(Number(campaignNumber))]);
    for (const entry of fs.readdirSync(videoSocialRoot, { withFileTypes: true })) {
      const target = safeJoin(videoSocialRoot, entry.name);
      const isCampaignDirectory = entry.isDirectory() && directoryNames.has(entry.name);
      const isCampaignFile = entry.isFile() && matchesCampaignPrefix(entry.name, campaignNumber);
      if (!isCampaignDirectory && !isCampaignFile) continue;
      fs.rmSync(target, { recursive: entry.isDirectory(), force: true });
      removed.push(target);
    }
  }

  return { campaignNumber, removed };
}

function resetMiniseriesWorkspace(root, rawCampaignNumber) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const minisseriesRoot = safeJoin(root, 'minisseries');
  const campaignRoot = safeJoin(minisseriesRoot, campaignNumber);
  const videoSocialRoot = safeJoin(minisseriesRoot, 'video social');
  const removed = [];

  if (fs.existsSync(campaignRoot)) {
    fs.rmSync(campaignRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    removed.push(campaignRoot);
  }

  if (fs.existsSync(videoSocialRoot)) {
    const directoryNames = new Set([campaignNumber, String(Number(campaignNumber))]);
    for (const entry of fs.readdirSync(videoSocialRoot, { withFileTypes: true })) {
      const isCampaignDirectory = entry.isDirectory() && directoryNames.has(entry.name);
      const isCampaignFile = entry.isFile() && matchesCampaignPrefix(entry.name, campaignNumber);
      if (!isCampaignDirectory && !isCampaignFile) continue;
      const target = safeJoin(videoSocialRoot, entry.name);
      fs.rmSync(target, { recursive: entry.isDirectory(), force: true, maxRetries: 3, retryDelay: 100 });
      removed.push(target);
    }
  }

  const workspace = ensureMiniseriesWorkspace(root, campaignNumber);
  return { campaignNumber, removed, workspace };
}

function directoryContainsFiles(directory) {
  if (!fs.existsSync(directory)) return false;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isFile()) return true;
    if (entry.isDirectory() && directoryContainsFiles(target)) return true;
  }
  return false;
}

function buildCompactionMappings(rawCampaignNumbers) {
  if (!Array.isArray(rawCampaignNumbers)) throw new Error('Lista de minisséries inválida.');
  const normalized = rawCampaignNumbers.map(normalizeCampaignNumber);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) throw new Error('A Biblioteca possui números duplicados.');
  return normalized
    .sort((a, b) => Number(a) - Number(b))
    .map((oldNumber, index) => ({
      oldNumber,
      newNumber: String(index + 1).padStart(2, '0')
    }));
}

function replaceCampaignMarkerInName(name, oldNumber, newNumber) {
  const oldPlain = String(Number(oldNumber));
  if (name === `M${oldNumber}` || name === `M${oldPlain}`) return `M${newNumber}`;
  let updated = name;
  const tokens = [...new Set([oldNumber, oldPlain])].sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp(`(^|[_-])${escaped}(?=[_.-]|$)`, 'g'), (_, prefix) => prefix + newNumber);
  }
  return updated;
}

function rewriteJsonCampaignReferences(value, oldNumber, newNumber, key = '', depth = 0) {
  const oldPlain = String(Number(oldNumber));
  const newPlain = String(Number(newNumber));
  const campaignKeys = new Set(['campaignNumber', 'campaignNum', 'docNum', 'docNumStr', 'numStr']);
  if (Array.isArray(value)) {
    return value.map(item => rewriteJsonCampaignReferences(item, oldNumber, newNumber, '', depth + 1));
  }
  if (value && typeof value === 'object') {
    for (const property of Object.keys(value)) {
      value[property] = rewriteJsonCampaignReferences(value[property], oldNumber, newNumber, property, depth + 1);
    }
    return value;
  }
  if (((key === 'number' && depth === 1) || campaignKeys.has(key)) && (String(value) === oldNumber || String(value) === oldPlain)) {
    return typeof value === 'number' ? Number(newNumber) : newNumber;
  }
  if (typeof value === 'string') {
    return value
      .replaceAll(`/minisseries/${oldNumber}/`, `/minisseries/${newNumber}/`)
      .replaceAll(`\\minisseries\\${oldNumber}\\`, `\\minisseries\\${newNumber}\\`)
      .replaceAll(`/M${oldNumber}/`, `/M${newNumber}/`)
      .replaceAll(`\\M${oldNumber}\\`, `\\M${newNumber}\\`);
  }
  return value;
}

function rewriteWorkspaceMarkers(workspaceRoot, oldNumber, newNumber) {
  if (!fs.existsSync(workspaceRoot) || oldNumber === newNumber) return;
  const directories = [];
  const files = [];
  const collect = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        collect(target);
        directories.push(target);
      } else if (entry.isFile()) {
        files.push(target);
      }
    }
  };
  collect(workspaceRoot);

  for (const filePath of files) {
    if (filePath.toLowerCase().endsWith('.json') || filePath.toLowerCase().endsWith('.json.bak')) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const rewritten = rewriteJsonCampaignReferences(parsed, oldNumber, newNumber);
        fs.writeFileSync(filePath, JSON.stringify(rewritten, null, 2), 'utf8');
      } catch (_) {}
    }
  }

  const pathsToRename = [...files, ...directories].sort((a, b) => b.length - a.length);
  for (const sourcePath of pathsToRename) {
    if (!fs.existsSync(sourcePath)) continue;
    const updatedName = replaceCampaignMarkerInName(path.basename(sourcePath), oldNumber, newNumber);
    if (updatedName === path.basename(sourcePath)) continue;
    const targetPath = path.join(path.dirname(sourcePath), updatedName);
    if (fs.existsSync(targetPath)) throw new Error(`Conflito ao renumerar ${path.basename(sourcePath)}.`);
    fs.renameSync(sourcePath, targetPath);
  }
}

function replaceLeadingCampaignNumber(name, newNumber) {
  const match = String(name).match(/^(\d+)/);
  if (!match) return name;
  const replacement = match[1].length > 1 && match[1].startsWith('0')
    ? newNumber
    : String(Number(newNumber));
  return replacement + name.slice(match[1].length);
}

function compactMiniseriesWorkspaces(root, rawCampaignNumbers) {
  const mappings = buildCompactionMappings(rawCampaignNumbers);
  const changes = mappings.filter(mapping => mapping.oldNumber !== mapping.newNumber);
  const minisseriesRoot = safeJoin(root, 'minisseries');
  const videoSocialRoot = safeJoin(root, 'minisseries', 'video social');

  if (changes.length === 0) {
    mappings.forEach(mapping => ensureMiniseriesWorkspace(root, mapping.newNumber));
    return { mappings, changed: 0 };
  }

  const workspaceChanges = changes.filter(mapping =>
    fs.existsSync(safeJoin(minisseriesRoot, mapping.oldNumber))
  );
  const sourceWorkspacePaths = new Set(
    workspaceChanges.map(mapping => safeJoin(minisseriesRoot, mapping.oldNumber))
  );
  for (const mapping of workspaceChanges) {
    const destination = safeJoin(minisseriesRoot, mapping.newNumber);
    if (fs.existsSync(destination) && !sourceWorkspacePaths.has(destination) && directoryContainsFiles(destination)) {
      throw new Error(`A pasta ${mapping.newNumber} contém arquivos e impede a renumeração segura.`);
    }
  }

  const assetMoves = [];
  if (fs.existsSync(videoSocialRoot)) {
    const changeByOld = new Map(changes.map(mapping => [Number(mapping.oldNumber), mapping]));
    for (const entry of fs.readdirSync(videoSocialRoot, { withFileTypes: true })) {
      const match = entry.name.match(/^(\d+)(?=\D|$)/);
      if (!match) continue;
      const mapping = changeByOld.get(Number(match[1]));
      if (!mapping) continue;
      const targetName = entry.isDirectory()
        ? mapping.newNumber
        : replaceLeadingCampaignNumber(entry.name, mapping.newNumber);
      assetMoves.push({
        source: safeJoin(videoSocialRoot, entry.name),
        target: safeJoin(videoSocialRoot, targetName),
        sourceName: entry.name,
        targetName
      });
    }
    const assetSources = new Set(assetMoves.map(move => move.source));
    for (const move of assetMoves) {
      if (!fs.existsSync(move.target) || assetSources.has(move.target)) continue;
      const stat = fs.statSync(move.target);
      if (stat.isDirectory() && !directoryContainsFiles(move.target)) continue;
      throw new Error(`O arquivo ${move.targetName} impede a renumeração segura.`);
    }
  }

  const stagingRoot = safeJoin(minisseriesRoot, `.vortex-renumber-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(stagingRoot, { recursive: true });
  const stagedWorkspaces = [];
  const stagedAssets = [];
  const committedWorkspaces = [];
  const committedAssets = [];

  try {
    for (const mapping of workspaceChanges) {
      const source = safeJoin(minisseriesRoot, mapping.oldNumber);
      if (!fs.existsSync(source)) continue;
      const staged = safeJoin(stagingRoot, `workspace-${mapping.oldNumber}`);
      fs.renameSync(source, staged);
      stagedWorkspaces.push({ ...mapping, source, staged });
    }
    assetMoves.forEach((move, index) => {
      if (!fs.existsSync(move.source)) return;
      const staged = safeJoin(stagingRoot, `asset-${index}`);
      fs.renameSync(move.source, staged);
      stagedAssets.push({ ...move, staged });
    });

    for (const mapping of workspaceChanges) {
      const destination = safeJoin(minisseriesRoot, mapping.newNumber);
      if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
    }
    for (const move of assetMoves) {
      if (!fs.existsSync(move.target)) continue;
      const stat = fs.statSync(move.target);
      if (stat.isDirectory() && !directoryContainsFiles(move.target)) {
        fs.rmSync(move.target, { recursive: true, force: true });
      }
    }

    for (const workspace of stagedWorkspaces) {
      const destination = safeJoin(minisseriesRoot, workspace.newNumber);
      fs.renameSync(workspace.staged, destination);
      rewriteWorkspaceMarkers(destination, workspace.oldNumber, workspace.newNumber);
      committedWorkspaces.push({ ...workspace, destination });
    }
    for (const asset of stagedAssets) {
      fs.renameSync(asset.staged, asset.target);
      committedAssets.push(asset);
    }

    mappings.forEach(mapping => ensureMiniseriesWorkspace(root, mapping.newNumber));
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    return { mappings, changed: changes.length };
  } catch (error) {
    for (const asset of committedAssets.reverse()) {
      if (fs.existsSync(asset.target) && !fs.existsSync(asset.source)) {
        fs.renameSync(asset.target, asset.source);
      }
    }
    for (const workspace of committedWorkspaces.reverse()) {
      if (fs.existsSync(workspace.destination) && !fs.existsSync(workspace.source)) {
        try {
          rewriteWorkspaceMarkers(workspace.destination, workspace.newNumber, workspace.oldNumber);
          fs.renameSync(workspace.destination, workspace.source);
        } catch (_) {}
      }
    }
    for (const workspace of stagedWorkspaces.reverse()) {
      if (fs.existsSync(workspace.staged) && !fs.existsSync(workspace.source)) {
        fs.renameSync(workspace.staged, workspace.source);
      }
    }
    for (const asset of stagedAssets.reverse()) {
      if (fs.existsSync(asset.staged) && !fs.existsSync(asset.source)) {
        fs.renameSync(asset.staged, asset.source);
      }
    }
    if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

function deleteAndCompactMiniseriesWorkspaces(root, rawCampaignNumber, remainingCampaignNumbers) {
  const campaignNumber = normalizeCampaignNumber(rawCampaignNumber);
  const minisseriesRoot = safeJoin(root, 'minisseries');
  const campaignRoot = safeJoin(minisseriesRoot, campaignNumber);
  const videoSocialRoot = safeJoin(minisseriesRoot, 'video social');
  const stagingRoot = safeJoin(minisseriesRoot, `.vortex-delete-${campaignNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const stagedTargets = [];
  const removed = [];
  fs.mkdirSync(stagingRoot, { recursive: true });

  try {
    if (fs.existsSync(campaignRoot)) {
      const staged = safeJoin(stagingRoot, 'workspace');
      fs.renameSync(campaignRoot, staged);
      stagedTargets.push({ source: campaignRoot, staged });
      removed.push(campaignRoot);
    }
    if (fs.existsSync(videoSocialRoot)) {
      let assetIndex = 0;
      const directoryNames = new Set([campaignNumber, String(Number(campaignNumber))]);
      for (const entry of fs.readdirSync(videoSocialRoot, { withFileTypes: true })) {
        const isCampaignDirectory = entry.isDirectory() && directoryNames.has(entry.name);
        const isCampaignFile = entry.isFile() && matchesCampaignPrefix(entry.name, campaignNumber);
        if (!isCampaignDirectory && !isCampaignFile) continue;
        const source = safeJoin(videoSocialRoot, entry.name);
        const staged = safeJoin(stagingRoot, `asset-${assetIndex++}`);
        fs.renameSync(source, staged);
        stagedTargets.push({ source, staged });
        removed.push(source);
      }
    }

    const compaction = compactMiniseriesWorkspaces(root, remainingCampaignNumbers);
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    return { deletion: { campaignNumber, removed }, ...compaction };
  } catch (error) {
    for (const target of stagedTargets.reverse()) {
      if (fs.existsSync(target.staged) && !fs.existsSync(target.source)) {
        try { fs.renameSync(target.staged, target.source); } catch (_) {}
      }
    }
    if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

module.exports = {
  normalizeCampaignNumber,
  getWorkspaceDirectories,
  ensureMiniseriesWorkspace,
  deleteMiniseriesWorkspace,
  resetMiniseriesWorkspace,
  matchesCampaignPrefix,
  buildCompactionMappings,
  compactMiniseriesWorkspaces,
  deleteAndCompactMiniseriesWorkspaces,
  replaceCampaignMarkerInName,
  rewriteJsonCampaignReferences,
  formatSubjectTextReport,
  saveMiniseriesSubject,
  saveMiniseriesCaption,
  saveMiniseriesFlowMaster,
  saveMiniseriesGeminiMotions,
  saveMiniseriesGptScenes,
  saveMiniseriesComplementaryScenes,
  saveMiniseriesQueue50,
  saveMiniseriesFlowMusic,
  saveFullMiniseriesCampaign,
  restoreFullBackup,
  readPhysicalCampaignWorkspace,
  exportFullBackup,
  saveOfficialBackupToRoot,
  findLatestBackupInRoot,
  restoreLatestBackupFromRoot
};
