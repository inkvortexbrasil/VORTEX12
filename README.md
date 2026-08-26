# 🌌 VORTEX12 - Estúdio de Geração e Automação Audiovisual

**VORTEX12** é um ecossistema proprietário e autônomo (Estúdio/Cockpit) de automação de fluxo de trabalho projetado para a produção massiva e orquestrada de minisséries, documentários e conteúdos audiovisuais de alta autoridade técnica e estética. Criado pela **InkVortex Brasil - Especialistas em Epson**, ele combina IA generativa, automação de navegador e renderização de vídeo acelerada por hardware em uma interface *glassmorphism* unificada.

## 🚀 Arquitetura e Objetivo

O estúdio VORTEX12 é desenhado em uma arquitetura de raiz dupla para separar lógica (código) e infraestrutura pesada de arquivos (mídia):
- **Núcleo Lógico (Frontend/Backend):** Um servidor local Node.js e uma SPA altamente estilizada (Cockpit). Gerencia integrações de API, orquestração de testes e o painel visual.
- **Camada de Automação (Robôs):** Utiliza Puppeteer em stealth (Ponte do Edge/Chrome) para controlar instâncias reais do ChatGPT e Gemini diretamente pela web, evadindo limitação de APIs e barateando custos operacionais na geração massiva de prompts e imagens.
- **Motor de Renderização (FFmpeg):** Automatiza toda a montagem de minisséries. Ele funde áudio sintetizado, geração de legendas sincronizadas palavra a palavra (usando algoritmos *Needleman-Wunsch* e *Whisper* local ou remoto) e transição de imagens em passagens de alta eficiência e aceleração de hardware (NVENC).

## 🛠️ Funções e Componentes Principais

### 1. Painel Multiverso (Centro de Comando)
Uma UI de imersão total que atua como central de operações do Diretor-Geral. Dali é possível:
- Visualizar e gerenciar campanhas ativas.
- Mudar de ambientes (Salas) entre Biblioteca, Documentários, Shorts, Comercial e Som.
- Visualizar telemetria em tempo real das automações web acontecendo no background.

### 2. Automação de IAs (GPT, Gemini e Qwen)
A espinha dorsal de texto e imagem. O VORTEX12 gerencia filas sequenciais complexas (50 imagens por minissérie).
- **Robô GPT:** Focado na confecção de scripts precisos e contextuais e orquestração textual contínua.
- **Robô Gemini:** Atuador visual principal encarregado de rodar em lote e gerar imagens e cenários de forma orquestrada, lendo manifestos e fazendo download validado por *hash*.
- **Qwen:** Robô auxiliar de alta precisão para a confecção de imagens.

### 3. Motor de Áudio e Sonoplastia
Integração massiva com geradores de áudio cantados e instrumentais (Flow Music).
- Manipulação de arquivos `.opus` vindos do Stacher/YouTube.
- Geração de "Áudio com Capa" (base para streaming e curadoria musical).

### 4. Renderizador Final (Motor de Vídeo)
O módulo FFmpeg/FFprobe não apenas junta arquivos, ele constrói as cenas:
- Processa áudio (M4A) contra o modelo Whisper, gera âncoras de tempo e alinha com o roteiro original.
- Cria os arquivos de legenda (ASS) customizados (limitados a 4 palavras ativas simultaneamente com iluminação precisa e cores dinâmicas) e converte em resoluções sociais adaptativas sem sobreposições.
- Acopla o letreiro animado da InkVortex e encerra o clipe renderizando fisicamente no disco.

## 🔒 Governança e Blindagem

O VORTEX12 possui um contrato estrito de continuidade (*AGENTS.md*). Determinadas zonas são de homologação fechada: as engrenagens de renderização e automação web não sofrem "refatorações não-autorizadas". Elas exigem um diagnóstico humano presencial para qualquer atualização, garantindo que atualizações de browser ou mudanças estruturais nas IAs de mercado não destruam as dependências de orquestração local.

---
**InkVortex Brasil © 2026**
*Autoridade Operacional do Estúdio VORTEX12*
