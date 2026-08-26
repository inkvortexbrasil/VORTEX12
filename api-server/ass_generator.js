/**
 * Gerador de Arquivos .ass (Advanced SubStation Alpha)
 * Cria legendas dinâmicas estilo TikTok a partir do JSON da Mistral.
 */

function generateTikTokAssScript(transcriptData, options = {}) {
    const playResX = Number(options.playResX) || 1920;
    const playResY = Number(options.playResY) || 1080;
    const fontSize = Number(options.fontSize) || 72;
    const marginHorizontal = Number(options.marginHorizontal) || 40;
    const marginVertical = Number(options.marginVertical) || 140;
    const maxWordsPerPhrase = Number(options.maxWordsPerPhrase) || 4;
    // Mistral returns words inside the 'segments' array when timestamp_granularities=word is requested
    const rawWords = Array.isArray(transcriptData) ? transcriptData : (transcriptData.words || transcriptData.segments || []);
    
    if (!rawWords || rawWords.length === 0) {
        throw new Error("O áudio não retornou palavras detectáveis.");
    }

    // Como o corte inicial foi desativado, mantemos os tempos absolutos originais
    const words = rawWords.map(w => ({
        word: (w.word || w.text).trim(),
        start: Math.max(0, w.start),
        end: Math.max(0, w.end),
        lineIdx: w.lineIdx
    })).filter(w => w.word.length > 0);

    // Dicionário de Correção Ortográfica e Termos Técnicos PT-BR (InkVortex / Têxtil / Gramática)
    const PT_BR_CORRECTIONS = {
        'algodao': 'algodão',
        'impressao': 'impressão',
        'impressora': 'impressora',
        'impressoras': 'impressoras',
        'tecnica': 'técnica',
        'tecnico': 'técnico',
        'tecnicos': 'técnicos',
        'polimero': 'polímero',
        'polimeros': 'polímeros',
        'sublimacao': 'sublimação',
        'producao': 'produção',
        'atencao': 'atenção',
        'evolucao': 'evolução',
        'revolucao': 'revolução',
        'solucao': 'solução',
        'edicao': 'edição',
        'opcao': 'opção',
        'minisserie': 'minissérie',
        'minisseries': 'minisséries',
        'nao': 'não',
        'sao': 'são',
        'estao': 'estão',
        'tambem': 'também',
        'ja': 'já',
        'ate': 'até',
        'voce': 'você',
        'voces': 'vocês',
        'termica': 'térmica',
        'termico': 'térmico',
        'epson': 'Epson',
        'dtg': 'DTG',
        'dgt': 'DTG',
        'btg': 'DTG',
        'bgt': 'DTG',
        'ttg': 'DTG',
        'ttgs': 'DTG',
        'tg': 'DTG',
        'deteg': 'DTG',
        'teteg': 'DTG',
        'dtf': 'DTF',
        'dft': 'DTF',
        'ttf': 'DTF',
        'ttfs': 'DTF',
        'tf': 'DTF',
        'detef': 'DTF',
        'tetef': 'DTF',
        'silicar': 'sílica',
        'estamole': 'estampa',
        'bio': 'Bio',
        'pio': 'Bio',
        'wink': 'Ink',
        'despespertado': 'despertado',
        'despiscam': 'piscam',
        'consagracao': 'consagração'
    };

    // Dicionário e Normalizador Fonético de Marca e Ortografia PT-BR
    for (let i = 0; i < words.length; i++) {
        const rawW = words[i].word;
        const clean = rawW.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
        const nextClean = (i < words.length - 1) ? words[i+1].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '') : '';
        const prevClean = (i > 0) ? words[i-1].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '') : '';

        // 0. Fusão Fonética de 3 Palavras/Letras em DTG ou DTF (ex: "D" "T" "G" -> "DTG", "T" "T" "G" -> "DTG", "D" "T" "F" -> "DTF")
        if (['d', 't', 'b', 'de', 'te'].includes(clean) && ['t', 'te', 'ti'].includes(nextClean) && i < words.length - 2) {
            const wordAfterNext = words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
            if (['g', 'ge', 'gui', 'j', 'je'].includes(wordAfterNext)) {
                words[i].word = "DTG";
                words[i].end = words[i+2].end;
                words[i+1].word = "";
                words[i+2].word = "";
                continue;
            }
            if (['f', 'fe', 'fi', 'ef'].includes(wordAfterNext)) {
                words[i].word = "DTF";
                words[i].end = words[i+2].end;
                words[i+1].word = "";
                words[i+2].word = "";
                continue;
            }
        }
        // 0A. Fusão Fonética de 2 Palavras/Letras em DTG ou DTF (quando a IA engole letras ou gagueja "DT, DTG")
        if (['d', 'de', 't', 'te', 'di', 'ti', 'dt'].includes(clean)) {
            if (['g', 'ge', 'gui', 'j', 'je', 'dtg'].includes(nextClean)) {
                words[i].word = "DTG";
                words[i].end = words[i+1].end;
                words[i+1].word = "";
                continue;
            }
            if (['f', 'fe', 'fi', 'ef', 'dtf'].includes(nextClean)) {
                words[i].word = "DTF";
                words[i].end = words[i+1].end;
                words[i+1].word = "";
                continue;
            }
        }
        
        // 0B. Quando a IA agrupa tudo em um único segmento "D, G," (clean = 'dg') ou "D, F," (clean = 'df')
        if (['dg', 'deg', 'teg', 'tg', 'dtg'].includes(clean)) {
            words[i].word = "DTG";
            continue;
        }
        if (['df', 'def', 'tef', 'tf', 'dtf'].includes(clean)) {
            words[i].word = "DTF";
            continue;
        }

        // 0A. Fonética de Marca de Transcrições Legadas ("Nois e ex-Brasil" / "Nois ex Brasil" -> "InkVortex Brasil")
        if (clean === 'nois' && (nextClean === 'e' || nextClean === 'ex' || nextClean === 'exbrasil')) {
            words[i].word = "InkVortex";
            words[i].end = (i + 2 < words.length) ? words[i+2].end : words[i].end;
            if (nextClean === 'e') words[i+1].word = "";
            if (i + 2 < words.length && words[i+2].word.toLowerCase().includes('ex')) words[i+2].word = "";
            if (i + 3 < words.length && (words[i+3].word.toLowerCase().includes('brasil') || words[i+3].word.toLowerCase().includes('brazil'))) {
                words[i+3].word = "Brasil";
            }
            continue;
        }

        // 0B. Fusão Fonética de Duas Palavras ("E que" / "É que" / "Eh que" + "Vortex" -> "InkVortex")
        if ((clean === 'e' || clean === 'eh' || clean === 'in' || clean === 'em' || clean === 'ein') && nextClean === 'que') {
            const wordAfterNext = (i < words.length - 2) ? words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '') : '';
            if (/^(?:vort|vortex|fort|bort)[a-z]*/i.test(wordAfterNext)) {
                words[i].word = "InkVortex";
                words[i].end = words[i+2].end; // Extende tempo final até o fim de Vortex
                words[i+1].word = ""; // Limpa "que"
                words[i+2].word = ""; // Limpa "Vortex"
                if (i + 3 < words.length && (words[i+3].word.toLowerCase().includes('brasil') || words[i+3].word.toLowerCase().includes('brazil'))) {
                    words[i+3].word = "Brasil";
                }
                continue;
            }
        }

        // 1. Marca Principal ("InkVortex" / "InkVortex Brasil", "Wink Vortex")
        if (/^(?:ink|inki|inky|inc|inque|emque|imque|enque|eing|wink|infort|imfort|emfort|incvort|inkvort|winkvort)[a-z]*(?:vort|fort|bort)[a-z]*/i.test(clean)) {
            if (nextClean === 'brasil' || nextClean === 'brazil') {
                words[i].word = "InkVortex";
                words[i+1].word = "Brasil";
            } else {
                words[i].word = "InkVortex";
            }
            continue;
        }

        // 2. Prefixo isolado ("ink", "inki", "inky", "inc", "inque", "eing", "wink") seguido de sufixo ("vortex", "vortéx", "fortex", "vortics", "vortes")
        if (['ink', 'inki', 'inky', 'inc', 'inque', 'eing', 'einque', 'enque', 'emque', 'imque', 'em', 'im', 'in', 'wink'].includes(clean)) {
            if (/^(?:vort|vortex|vortex|fort|bort|vorti|forti|vortec|fortec)[a-z]*/i.test(nextClean)) {
                words[i].word = "InkVortex";
                words[i].end = words[i+1].end; // Extende tempo final até o fim do sufixo
                words[i+1].word = ""; // Limpa sufixo para fusão
                if (i + 2 < words.length && (words[i+2].word.toLowerCase().includes('brasil') || words[i+2].word.toLowerCase().includes('brazil'))) {
                    words[i+2].word = "Brasil";
                }
            }
        }

        // 3. Sufixo isolado ("vortex", "vortics", "fortex", "vortes") precedido por prefixo ou em contexto de marca
        if (/^(?:vortex|vortics|vortecx|fortex|fortecx|vortes|bortex)$/i.test(clean)) {
            if (['ink', 'inki', 'inky', 'inc', 'inque', 'eing', 'em', 'in', 'im', 'wink'].includes(prevClean)) {
                words[i-1].word = "InkVortex";
                words[i-1].end = words[i].end; // Extende tempo final até o fim do sufixo
                words[i].word = ""; // Limpa sufixo para fusão
            } else if (nextClean === 'brasil' || nextClean === 'brazil' || nextClean === 'de' || nextClean === 'no' || nextClean === 'em') {
                // Em contextos de vinheta ("Vortex Brasil", "Vortex de cor", "Vortex no peito") -> normaliza para "InkVortex"
                words[i].word = "InkVortex";
                if (nextClean === 'brasil' || nextClean === 'brazil') {
                    words[i+1].word = "Brasil";
                }
            } else {
                words[i].word = "Vortex";
            }
        }

        // 4. Termos Compostos e Fraseologia de Marca (Link na Bio, Mercado Livre, Fixa)
        if (clean === 'com' && nextClean === 'a') {
            const wordAfterNext = (i < words.length - 2) ? words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '') : '';
            if (wordAfterNext === 'sagrado' || wordAfterNext === 'sagrada' || wordAfterNext === 'sagracao') {
                words[i].word = "consagração";
                words[i].end = words[i+2].end; // Extende tempo até o fim de sagrado
                words[i+1].word = ""; // Limpa "a"
                words[i+2].word = ""; // Limpa "sagrado"
                continue;
            }
        }
        if (clean === 'mercado' && nextClean === 'livre') {
            words[i].word = "Mercado";
            words[i+1].word = "Livre";
            continue;
        }

        // Fraseologia Estrita "link na bio" / "link navio" / "e link navio"
        if (clean === 'link' || clean === 'linqui' || clean === 'linc') {
            words[i].word = "link";
            if (nextClean === 'navio' || nextClean === 'nabio' || nextClean === 'enavio') {
                words[i+1].word = "na Bio";
            } else if ((nextClean === 'e' || nextClean === 'na' || nextClean === 'no') && i < words.length - 2) {
                const afterNext = words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
                if (afterNext === 'navio' || afterNext === 'nabio' || afterNext === 'bio' || afterNext === 'vio') {
                    words[i+1].word = "na";
                    words[i+2].word = "Bio";
                }
            }
            continue;
        }

        if ((clean === 'navio' || clean === 'nabio' || clean === 'pio' || clean === 'bio') && (prevClean === 'na' || prevClean === 'link')) {
            if (clean === 'navio' || clean === 'nabio') {
                words[i].word = "na Bio";
            } else {
                words[i].word = "Bio";
            }
            continue;
        }

        // Correção Técnica: "fica" -> "fixa" apenas em contexto de impressão
        if (clean === 'ficha' || clean === 'fisa' || clean === 'fixa' || (clean === 'fica' && ['no', 'na', 'em', 'sem', 'tecido', 'couro', 'poliester', 'algodao'].includes(nextClean))) {
            words[i].word = "fixa";
            if (nextClean === 'sem' && i < words.length - 2) {
                const wordAfterNext = words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
                if (['couro', 'poliester', 'polimero', 'tecido', 'algodao', 'metal'].includes(wordAfterNext)) {
                    words[i+1].word = "em";
                }
            }
            continue;
        }

        if (clean === 'sem' && (prevClean === 'fixa' || prevClean === 'fica') && (nextClean === 'couro' || nextClean === 'poliester' || nextClean === 'tecido' || nextClean === 'algodao')) {
            words[i].word = "em";
            continue;
        }

        // Correção de Vocabulário Técnico: "desfenda" -> "desvenda", "dropshipping" e "tu rala" -> "Do ralo"
        if ((clean === 'tu' || clean === 'toralo' || clean === 'turala') && (nextClean === 'rala' || nextClean === 'ralo' || nextClean === 'a')) {
            words[i].word = "Do";
            if (nextClean === 'rala' || nextClean === 'ralo') {
                words[i+1].word = "ralo";
            }
            continue;
        }

        if (clean === 'desfenda' || clean === 'desfendas' || clean === 'defenda' && (nextClean === 'a' || nextClean === 'o' || prevClean === 'brasil')) {
            words[i].word = clean.endsWith('s') ? "desvendas" : "desvenda";
            continue;
        }

        if (clean === 'drop' || clean === 'dropsipping' || clean === 'dropshiping') {
            if (clean === 'drop') {
                if ((nextClean === 'e' || nextClean === 'de') && i < words.length - 2) {
                    const wordAfterNext = words[i+2].word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
                    if (['sipping', 'shipping', 'siping', 'shiping'].includes(wordAfterNext)) {
                        words[i].word = "dropshipping";
                        words[i].end = words[i+2].end;
                        words[i+1].word = "";
                        words[i+2].word = "";
                        continue;
                    }
                } else if (['sipping', 'shipping', 'siping', 'shiping'].includes(nextClean)) {
                    words[i].word = "dropshipping";
                    words[i].end = words[i+1].end;
                    words[i+1].word = "";
                    continue;
                } else {
                    words[i].word = "dropshipping";
                }
            } else {
                words[i].word = "dropshipping";
                continue;
            }
        }

        if (clean === 'df' && (prevClean === 'na' || prevClean === 'no' || nextClean === 'nao' || nextClean === 'pede')) {
            words[i].word = "DTF";
            continue;
        }
        if (clean === 'tia' && nextClean === 'vileta') {
            words[i].word = "ultravioleta";
            words[i+1].word = "";
            continue;
        }

        // 5. Correção Dicionairizada de Palavras PT-BR
        if (PT_BR_CORRECTIONS[clean]) {
            // Preserva pontuação original se houver
            const prefixPunct = rawW.match(/^[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+/)?.[0] || '';
            const suffixPunct = rawW.match(/[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+$/)?.[0] || '';
            words[i].word = prefixPunct + PT_BR_CORRECTIONS[clean] + suffixPunct;
        }
    }

    const cleanWords = words.filter(w => w.word.trim().length > 0);
    console.log('[ASS_GENERATOR] Filtered Brand Text:', cleanWords.map(w => w.word).join(' '));

    // Agrupar palavras em frases baseando-se nas estrofes/linhas do TXT (se disponível) ou no limite de palavras
    const phrases = [];
    
    if (cleanWords.length > 0 && typeof cleanWords[0].lineIdx !== 'undefined') {
        const MAX_WORDS_PER_PHRASE = maxWordsPerPhrase;
        const MAX_GAP_SECONDS = 1.0;
        let currentPhrase = [];
        let currentLineIdx = cleanWords[0].lineIdx;

        for (let i = 0; i < cleanWords.length; i++) {
            const w = cleanWords[i];
            
            if (currentPhrase.length > 0) {
                const lastW = currentPhrase[currentPhrase.length - 1];
                if (w.lineIdx !== currentLineIdx || w.start - lastW.end > MAX_GAP_SECONDS || currentPhrase.length >= MAX_WORDS_PER_PHRASE) {
                    phrases.push(currentPhrase);
                    currentPhrase = [];
                    currentLineIdx = w.lineIdx;
                }
            }
            currentPhrase.push(w);
        }
        if (currentPhrase.length > 0) phrases.push(currentPhrase);
    } else {
        const MAX_WORDS_PER_PHRASE = maxWordsPerPhrase;
        const MAX_GAP_SECONDS = 1.0;
        let currentPhrase = [];
        
        for (let i = 0; i < cleanWords.length; i++) {
            const w = cleanWords[i];
            if (currentPhrase.length > 0) {
                const lastW = currentPhrase[currentPhrase.length - 1];
                if (w.start - lastW.end > MAX_GAP_SECONDS) {
                    phrases.push(currentPhrase);
                    currentPhrase = [];
                }
            }
            currentPhrase.push(w);
            if (currentPhrase.length >= MAX_WORDS_PER_PHRASE) {
                phrases.push(currentPhrase);
                currentPhrase = [];
            }
        }
        if (currentPhrase.length > 0) phrases.push(currentPhrase);
    }

    // Função auxiliar para formatar tempo no formato ASS: H:MM:SS.cs (centissegundos)
    function formatAssTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100);
        
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }

    // Estilo Base do ASS (2026 High-Engagement Standard: Space Grotesk / Impact, Micro-Pop 112% Active Word, Gold Glow)
    const header = `[Script Info]
Title: 2026 High Engagement TikTok Subtitles
ScriptType: v4.00+
WrapStyle: 1
ScaledBorderAndShadow: yes
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,Space Grotesk,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,3,2,${marginHorizontal},${marginHorizontal},${marginVertical},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let events = '';

    for (let phraseIndex = 0; phraseIndex < phrases.length; phraseIndex++) {
        const phrase = phrases[phraseIndex];
        if (!phrase || phrase.length === 0) continue;

        // 2026 Retention Style: ALL CAPS com Micro-Pop
        const plainWords = phrase.map(w => w.word.trim().toUpperCase());
        const numWords = phrase.length;

        // Respeita o tempo do Whisper e impede que uma frase continue depois do início da próxima.
        // O limite de palavras continua sendo definido por MAX_WORDS_PER_PHRASE.
        const phraseStart = phrase[0].start;
        let phraseEnd = phrase[phrase.length - 1].end;

        if (phraseEnd - phraseStart > 2.8) {
            phraseEnd = phraseStart + 2.8;
        } else if (phraseEnd - phraseStart < 1.2) {
            phraseEnd = phraseStart + 1.4;
        }

        const nextPhrase = phrases[phraseIndex + 1];
        if (nextPhrase && nextPhrase.length > 0) {
            const nextPhraseStart = Number(nextPhrase[0].start);
            if (Number.isFinite(nextPhraseStart) && nextPhraseStart > phraseStart && phraseEnd > nextPhraseStart) {
                phraseEnd = nextPhraseStart;
            }
        }

        if (phraseEnd <= phraseStart) {
            phraseEnd = phraseStart + 0.01;
        }

        const totalPhraseDur = phraseEnd - phraseStart;
        const step = totalPhraseDur / numWords;

        for (let i = 0; i < numWords; i++) {
            const startT = phraseStart + (i * step);
            const endT = phraseStart + ((i + 1) * step);

            let eventText = '';
            for (let j = 0; j < plainWords.length; j++) {
                if (j === i) {
                    // Palavra Ativa -> Destaque Amarelo Ouro Elétrico + Animação Pop (Tilt)
                    eventText += `{\\c&H0000E6FF&\\t(0,100,\\fscx115\\fscy115\\frz-3)}${plainWords[j]}{\\r} `;
                } else {
                    // Palavras Inativas -> Branco Puro + Escala Normal 100%
                    eventText += `{\\c&H00FFFFFF&\\fscx100\\fscy100}${plainWords[j]}{\\r} `;
                }
            }

            eventText = eventText.trim();
            events += `Dialogue: 0,${formatAssTime(startT)},${formatAssTime(endT)},TikTok,,0,0,0,,${eventText}\n`;
        }
    }

    const assContent = header + events;
    return { assContent: assContent };
}

module.exports = { generateTikTokAssScript };
