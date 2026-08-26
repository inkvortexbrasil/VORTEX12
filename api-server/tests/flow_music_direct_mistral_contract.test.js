const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');
const llmSource = fs.readFileSync(path.join(root, 'api-server', 'services', 'llm_service.js'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');

const validatorStart = serverSource.indexOf('const FLOW_MUSIC_ROOT_FIELDS');
const validatorEnd = serverSource.indexOf('\nconst CAPTION_ROOT_FIELDS', validatorStart);
assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'O validador FlowMusic deve existir.');

const validatorSource = serverSource.slice(validatorStart, validatorEnd);
const sandbox = {};
vm.runInNewContext(`
function countPromptWords(value) {
  return String(value || '').trim().split(/\\s+/u).filter(Boolean).length;
}
${validatorSource}
this.validateFlowMusic = validateFlowMusicOutput;
`, sandbox);

const expected = {
  title: 'Tecnologia Têxtil em Transformação',
  style: 'Rock',
  variation: 'Progressive Rock',
  voice: 'Voz Feminina (PT-BR)'
};

const lyrics = [
  '[Verse 1]',
  'Cinza industrial no mundo oculto e escuro',
  'Embalagem comum guarda o segredo puro',
  'Como provar o real sem chip nem sinal?',
  'Sem bateria externa, a dúvida é fatal!',
  '',
  '[Pre-Chorus]',
  'Mas no fundo da matéria a força vai surgir',
  'Sem rastros visíveis para a fraude iludir',
  'A tensão se acumula, o código no ar',
  'A luz ultravioleta pronta pra despertar!',
  '',
  '[Chorus]',
  'Pontos de carbono em brilho quântico!',
  'Matriz polimérica num salto magnético!',
  'Luz inalterável que nasce do escuro',
  'Assinatura pura que protege o futuro!',
  'Rastreio intrínseco, a ciência revela',
  'A luz que autentica e transforma a embalagem nela!',
  '',
  '[Verse 2]',
  'A dúvida se esvai na malha de polímero',
  'Um mapa invisível num brilho efêmero',
  'Reduz o custo humano, protege o amanhã',
  'Segurança absoluta na fibra mais sã',
  'Rastreabilidade viva em cada milímetro',
  'Onde a matéria canta seu próprio barômetro!',
  '',
  '[Chorus]',
  'Pontos de carbono em brilho quântico!',
  'Matriz polimérica num salto magnético!',
  'Luz inalterável que nasce do escuro',
  'Assinatura pura que protege o futuro!',
  'Rastreio intrínseco, a ciência revela',
  'A luz que autentica e transforma a embalagem nela!',
  '',
  '[Bridge]',
  'Sintetizadores giram em pulso modular',
  'A revolução silenciosa não vai mais parar',
  'Sem chips, sem baterias, sem medo da ilusão',
  'A física quântica gravada na palma da mão!',
  '',
  '[Chorus]',
  'Pontos de carbono em brilho quântico!',
  'Matriz polimérica num salto magnético!',
  'Luz inalterável que nasce do escuro',
  'Assinatura pura que protege o futuro!',
  'Rastreio intrínseco, a ciência revela',
  'A luz que autentica e transforma a embalagem nela!',
  '',
  '[Outro]',
  'Revolução imbatível no brilho do polímero',
  'Selo quântico eterno, presente no perímetro',
  'Autenticidade pura, inovação no Brasil',
  'InkVortex Brasil firma a luz que ninguém viu!',
  'InkVortex Brasil... no pulso do amanhã!',
  '[Fade Out]'
].join('\n');

const musicalComposition = 'Cold open. Vocals start at 0:00 on beat 1. Dark Trap, Heavy Beat, 150 BPM, Key C# Minor, punchy 808 sub-bass attack, dark synth arpeggio, sharp upfront female lead vocal, instant full band launch on beat 1, direct vocal start with no delay, explosive anthemic choruses. Track Duration: 180s. Language: pt-BR; Clear female lead voice, powerful soprano, sharp upfront vocal attack at 0.0s, warm texture, precise pt-BR enunciation.';

const coverPrompt = 'Album cover artwork, luminescent quantum carbon dots glowing with intense cyan and amber bioluminescence inside a sleek translucent polymer matrix, ultraviolet light revealing microscopic security patterns, dark industrial background with neon volumetric fog, high contrast, cinematic macro photography, ultra-detailed 8K render, clean symmetrical composition, zero text, no words, no letters, no typography, no watermarks, no logos, no borders, square 1:1 format.';

const validOutput = { musicalComposition, lyrics, coverPrompt };

const validated = sandbox.validateFlowMusic(validOutput, expected);
assert.equal(validated.lyrics, lyrics, 'lyrics deve permanecer byte a byte igual.');
assert.equal(validated.musicalComposition, musicalComposition, 'musicalComposition deve permanecer byte a byte igual.');
assert.equal(validated.coverPrompt, coverPrompt, 'coverPrompt deve permanecer byte a byte igual.');

assert.equal(
  sandbox.validateFlowMusic({ ...validOutput, lyrics: lyrics.replace('[Pre-Chorus]', '[Build]') }, expected).lyrics,
  lyrics.replace('[Pre-Chorus]', '[Build]'),
  'A progressão editorial deve chegar ao Diretor sem bloqueio automático.'
);
assert.equal(
  sandbox.validateFlowMusic({ ...validOutput, musicalComposition: musicalComposition.replace('150 BPM', '140 BPM') }, expected).musicalComposition,
  musicalComposition.replace('150 BPM', '140 BPM'),
  'A estrutura musical deve permanecer como orientação, não trava.'
);
assert.throws(
  () => sandbox.validateFlowMusic({ ...validOutput, lyrics: '' }, expected),
  /devem conter texto utilizável/
);

const schemaValidatorStart = llmSource.indexOf('function validateOutputSchema');
const schemaValidatorEnd = llmSource.indexOf('\nfunction extractJsonValue', schemaValidatorStart);
assert.ok(schemaValidatorStart >= 0 && schemaValidatorEnd > schemaValidatorStart, 'O validador estrutural do serviço deve existir.');
const schemaSandbox = {};
vm.runInNewContext(`${llmSource.slice(schemaValidatorStart, schemaValidatorEnd)}\nthis.validateOutputSchema = validateOutputSchema;`, schemaSandbox);
assert.equal(schemaSandbox.validateOutputSchema('flowMusic', validOutput).valid, true);
assert.equal(schemaSandbox.validateOutputSchema('flowMusic', { coverPrompt }).valid, false);

const flowContract = contracts.slice(
  contracts.indexOf('## Contrato: FlowMusic'),
  contracts.indexOf('\n```', contracts.indexOf('```text', contracts.indexOf('## Contrato: FlowMusic')) + 7)
);
assert.match(flowContract, /mistral-large-latest/);
assert.match(flowContract, /temperature: 0\.82/);
assert.match(flowContract, /CRITICAL ZERO-LATENCY ARCHITECTURE/);
assert.match(flowContract, /COLD OPEN RIGID PUNCTUATION/);
assert.match(flowContract, /SLASH ANCHORING ON FIRST WORD/);
assert.match(flowContract, /METRIC METRICS & SUNG LYRICS/);
assert.match(flowContract, /NO FADE OUT/);
assert.match(flowContract, /ALBUM COVER ARTWORK/);
assert.match(flowContract, /Contexto Mestre/i);
assert.match(flowContract, /musicStoryArc/i);
assert.doesNotMatch(flowContract, /CENAS COMPLETAS 01–10/);
assert.match(flowContract, /Mention "InkVortex Brasil" exclusively in the \[Outro\]/);
assert.match(flowContract, /Cold open\. Vocals start at 0:00 on beat 1\./);
assert.match(flowContract, /coverPrompt/);
assert.doesNotMatch(flowContract, /Poet-Laureate|synesthesia|hyperbole|mythical architect/i);

assert.match(serverSource, /strictJson:\s*true/);
assert.match(serverSource, /responseSchema:\s*STRUCTURED_OUTPUT_SCHEMAS\.flowMusic/);
assert.match(serverSource, /validateResult:\s*parsed => validateFlowMusicOutput/);
assert.doesNotMatch(serverSource, /CENAS COMPLETAS 01–10/);
assert.match(serverSource, /musicStoryArc/);
assert.doesNotMatch(serverSource, /formatContractField/);
assert.match(llmSource, /strictJson \? JSON\.parse/);
assert.match(llmSource, /typeof validateResult === 'function'/);

console.log('flow_music_direct_mistral_contract.test.js: OK');
