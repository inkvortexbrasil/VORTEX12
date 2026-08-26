const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const { getFfmpegDir } = require('./utils/paths');

function getFfmpegPath() {
  const ffmpegDir = getFfmpegDir();
  const ffmpegPath = path.join(ffmpegDir, 'bin', 'ffmpeg.exe');
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg local não encontrado: ${ffmpegPath}`);
  }
  return `"${ffmpegPath}"`;
}

const FFMPEG_PATH = getFfmpegPath();

/**
 * Assemblador dinâmico de Shorts (50s)
 * @param {Object} params
 * @param {string} params.coverImagePath - 1s
 * @param {string} params.masterVideoPath - 10s
 * @param {string[]} params.contentImagePaths - 5 imagens x 4s = 20s
 * @param {string[]} params.ctaImagePaths - 3 imagens x 3s = 9s
 * @param {string} params.logoVideoPath - 10s
 * @param {string} params.soundtrackPath - Trilha de fundo
 * @param {string} params.voicePath - (Opcional) Locução
 * @param {string} params.outputPath - Arquivo de saída mp4
 */
function assembleShortsVideo(params) {
    return new Promise((resolve, reject) => {
        try {
            const inputs = [];
            const filterChains = [];
            let inputIdx = 0;

            // Constantes de resolução (Shorts 9:16)
            const W = 1080;
            const H = 1920;

            // MODO CANVA / MONTAGEM SECA: Resolução 1080x1920 sem efeitos pesados
            const staticScale = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
            let concatStreams = '';

            // 0. Capa (1s - Imagem)
            inputs.push(`-loop 1 -t 1 -i "${params.coverImagePath}"`);
            filterChains.push(`[${inputIdx}:v]${staticScale},setsar=1[v${inputIdx}]`);
            filterChains.push(`anullsrc=r=44100:cl=stereo,atrim=duration=1[a${inputIdx}]`);
            concatStreams += `[v${inputIdx}][a${inputIdx}]`;
            inputIdx++;

            // 1. Master Video (10s - Vídeo com Áudio Nativo 100%)
            inputs.push(`-t 10 -i "${params.masterVideoPath}"`);
            filterChains.push(`[${inputIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=25[v${inputIdx}]`);
            filterChains.push(`[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${inputIdx}]`);
            concatStreams += `[v${inputIdx}][a${inputIdx}]`;
            inputIdx++;

            // 2 e 3. Intercala Imagens do GPT e Gemini (10x 3.5s = 35s)
            // Ordem: GPT 01, Gemini 01, GPT 02, Gemini 02, etc.
            const gptList = params.gptImagePaths || params.contentImagePaths || [];
            const geminiList = params.geminiImagePaths || [];
            const maxLen = Math.max(gptList.length, geminiList.length);
            
            for (let i = 0; i < maxLen; i++) {
                if (i < gptList.length) {
                    inputs.push(`-loop 1 -t 3.5 -i "${gptList[i]}"`);
                    filterChains.push(`[${inputIdx}:v]${staticScale},setsar=1[v${inputIdx}]`);
                    filterChains.push(`anullsrc=r=44100:cl=stereo,atrim=duration=3.5[a${inputIdx}]`);
                    concatStreams += `[v${inputIdx}][a${inputIdx}]`;
                    inputIdx++;
                }
                if (i < geminiList.length) {
                    inputs.push(`-loop 1 -t 3.5 -i "${geminiList[i]}"`);
                    filterChains.push(`[${inputIdx}:v]${staticScale},setsar=1[v${inputIdx}]`);
                    filterChains.push(`anullsrc=r=44100:cl=stereo,atrim=duration=3.5[a${inputIdx}]`);
                    concatStreams += `[v${inputIdx}][a${inputIdx}]`;
                    inputIdx++;
                }
            }

            // 4. Logo Video/Image (10s)
            if (params.logoVideoPath.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/i)) {
                inputs.push(`-loop 1 -t 10 -i "${params.logoVideoPath}"`);
                filterChains.push(`[${inputIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=25[v${inputIdx}]`);
                filterChains.push(`anullsrc=r=44100:cl=stereo,atrim=duration=10[a${inputIdx}]`);
            } else {
                inputs.push(`-t 10 -i "${params.logoVideoPath}"`);
                filterChains.push(`[${inputIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=25[v${inputIdx}]`);
                filterChains.push(`[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${inputIdx}]`);
            }
            concatStreams += `[v${inputIdx}][a${inputIdx}]`;
            inputIdx++;

            // 5. Imagem CTA Final da pasta cta_video/01.png (4s)
            const ctaPath = params.ctaVideoImagePath || (params.ctaImagePaths && params.ctaImagePaths[0]) || params.coverImagePath;
            inputs.push(`-loop 1 -t 4 -i "${ctaPath}"`);
            filterChains.push(`[${inputIdx}:v]${staticScale},setsar=1[v${inputIdx}]`);
            filterChains.push(`anullsrc=r=44100:cl=stereo,atrim=duration=4[a${inputIdx}]`);
            concatStreams += `[v${inputIdx}][a${inputIdx}]`;
            inputIdx++;

            // Concatena vídeos E áudios nativos sequenciais dos vídeos a 100% de volume
            filterChains.push(`${concatStreams}concat=n=${inputIdx}:v=1:a=1[outv][outa_video]`);

            // Adiciona a Trilha Sonora MP3 de Fundo
            const soundtrackIdx = inputIdx;
            inputs.push(`-i "${params.soundtrackPath}"`);

            // Sobrepõe a trilha de fundo mantendo 100% do volume nativo do áudio dos vídeos
            filterChains.push(`[outa_video][${soundtrackIdx}:a]amix=inputs=2:weights=1 1:duration=first:dropout_transition=0[outa]`);

            const filterComplex = filterChains.join('; ');
            const cmd = `${FFMPEG_PATH} -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${params.outputPath}"`;

            console.log("Executando FFmpeg Single-Pass Master Render...");
            exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
                if (error) {
                    console.error("Erro no FFmpeg Master Render:", stderr);
                    return reject(error);
                }
                console.log("✅ Vídeo Social Máster Renderizado com Sucesso em:", params.outputPath);
                resolve(params.outputPath);
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Motor FFMPEG para queimar legendas dinâmicas (.ass) em cima de um videoclipe
 */
function burnSubtitlesToAudioVideo(params) {
    return new Promise((resolve, reject) => {
        try {
            // No Windows, o filtro ass do FFMPEG exige um path com barras normais (/) 
            // e dois pontos escapados (\:) caso tenha drive letter (C\:).
            let formattedAss = params.assFile.replace(/\\/g, '/');
            formattedAss = formattedAss.replace(/:/g, '\\:');
            
            // Corte Inteligente (Smart Trim): Injeta -ss antes do -i para corte rápido e preciso
            const ssParam = params.trimStartTime && params.trimStartTime > 0 ? `-ss ${params.trimStartTime}` : '';
            
            // Caminho absoluto para a pasta de fontes customizadas (Montserrat Black)
            let fontsDir = require('path').join(__dirname, 'fonts').replace(/\\/g, '/');
            fontsDir = fontsDir.replace(/:/g, '\\:'); // Escapar o 2 pontos do drive letter pro FFMPEG não achar que é outro parâmetro

            // Queima as legendas, copia o áudio original.
            // O parâmetro fontsdir instrui o FFMPEG a procurar a fonte Montserrat Black nesta pasta
            const cmd = `${FFMPEG_PATH} -y ${ssParam} -i "${params.inputVideo}" -vf "ass='${formattedAss}':fontsdir='${fontsDir}'" -c:v libx264 -pix_fmt yuv420p -c:a copy -movflags +faststart "${params.outputPath}"`;

            console.log("Executando FFmpeg Subtitles Engine (Queima de Legendas Dinâmicas)...");
            exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    console.error("Erro no FFmpeg Subtitles:", stderr);
                    return reject(error);
                }
                console.log("✅ FFmpeg Legendas Dinâmicas finalizado com sucesso!");
                resolve(params.outputPath);
            });
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { assembleShortsVideo, burnSubtitlesToAudioVideo };
