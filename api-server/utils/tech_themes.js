/**
 * tech_themes.js — Banco de 21 Eixos Tecnológicos de Vanguarda
 * Indústria Gráfica, Têxtil, Eletrônica Impressa e Embalagens Inteligentes (InkVortex Brasil)
 */

const TECH_THEMES = Object.freeze([
  {
    id: 'theme_01',
    number: 1,
    title: 'Tema Livre / Personalizado',
    category: 'Tema Livre',
    summary: 'Tema Livre / Personalizado [Tema Livre]',
    briefing: 'Tema Livre / Personalizado [Tema Livre]'
  },
  {
    id: 'theme_02',
    number: 2,
    title: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras',
    category: 'Indústria Têxtil',
    summary: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras [Indústria Têxtil]',
    briefing: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras [Indústria Têxtil]'
  },
  {
    id: 'theme_03',
    number: 3,
    title: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água [Indústria Têxtil]',
    briefing: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água [Indústria Têxtil]'
  },
  {
    id: 'theme_04',
    number: 4,
    title: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas [Indústria Têxtil]',
    briefing: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas [Indústria Têxtil]'
  },
  {
    id: 'theme_05',
    number: 5,
    title: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido',
    category: 'Indústria Têxtil',
    summary: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido [Indústria Têxtil]',
    briefing: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido [Indústria Têxtil]'
  },
  {
    id: 'theme_06',
    number: 6,
    title: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes',
    category: 'Indústria Têxtil',
    summary: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes [Indústria Têxtil]',
    briefing: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes [Indústria Têxtil]'
  },
  {
    id: 'theme_07',
    number: 7,
    title: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes',
    category: 'Indústria Têxtil',
    summary: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes [Indústria Têxtil]',
    briefing: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes [Indústria Têxtil]'
  },
  {
    id: 'theme_08',
    number: 8,
    title: 'Inteligência Artificial no Design Têxtil & Otimização Automática',
    category: 'Indústria Têxtil',
    summary: 'Inteligência Artificial no Design Têxtil & Otimização Automática [Indústria Têxtil]',
    briefing: 'Inteligência Artificial no Design Têxtil & Otimização Automática [Indústria Têxtil]'
  },
  {
    id: 'theme_09',
    number: 9,
    title: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas',
    category: 'Indústria Têxtil',
    summary: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas [Indústria Têxtil]',
    briefing: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas [Indústria Têxtil]'
  },
  {
    id: 'theme_10',
    number: 10,
    title: 'Tintas Reativas Digitais & Fixação Contínua em Algodão',
    category: 'Indústria Têxtil',
    summary: 'Tintas Reativas Digitais & Fixação Contínua em Algodão [Indústria Têxtil]',
    briefing: 'Tintas Reativas Digitais & Fixação Contínua em Algodão [Indústria Têxtil]'
  },
  {
    id: 'theme_11',
    number: 11,
    title: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio',
    category: 'Indústria Têxtil',
    summary: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio [Indústria Têxtil]',
    briefing: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio [Indústria Têxtil]'
  },
  {
    id: 'theme_12',
    number: 12,
    title: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos',
    category: 'Indústria Têxtil',
    summary: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos [Indústria Têxtil]',
    briefing: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos [Indústria Têxtil]'
  },
  {
    id: 'theme_13',
    number: 13,
    title: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll',
    category: 'Indústria Têxtil',
    summary: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll [Indústria Têxtil]',
    briefing: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll [Indústria Têxtil]'
  },
  {
    id: 'theme_14',
    number: 14,
    title: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital',
    category: 'Indústria Têxtil',
    summary: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital [Indústria Têxtil]',
    briefing: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital [Indústria Têxtil]'
  },
  {
    id: 'theme_15',
    number: 15,
    title: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos',
    category: 'Indústria Têxtil',
    summary: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos [Indústria Têxtil]',
    briefing: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos [Indústria Têxtil]'
  },
  {
    id: 'theme_16',
    number: 16,
    title: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa',
    category: 'Indústria Têxtil',
    summary: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa [Indústria Têxtil]',
    briefing: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa [Indústria Têxtil]'
  },
  {
    id: 'theme_17',
    number: 17,
    title: 'Rastreabilidade Têxtil & Passaporte Digital Impresso',
    category: 'Indústria Têxtil',
    summary: 'Rastreabilidade Têxtil & Passaporte Digital Impresso [Indústria Têxtil]',
    briefing: 'Rastreabilidade Têxtil & Passaporte Digital Impresso [Indústria Têxtil]'
  },
  {
    id: 'theme_18',
    number: 18,
    title: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica',
    category: 'Indústria Têxtil',
    summary: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica [Indústria Têxtil]',
    briefing: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica [Indústria Têxtil]'
  },
  {
    id: 'theme_19',
    number: 19,
    title: 'Tintas Termocrômicas Digitais & Estamparia Responsiva',
    category: 'Indústria Têxtil',
    summary: 'Tintas Termocrômicas Digitais & Estamparia Responsiva [Indústria Têxtil]',
    briefing: 'Tintas Termocrômicas Digitais & Estamparia Responsiva [Indústria Têxtil]'
  },
  {
    id: 'theme_20',
    number: 20,
    title: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos',
    category: 'Indústria Têxtil',
    summary: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos [Indústria Têxtil]',
    briefing: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos [Indústria Têxtil]'
  },
  {
    id: 'theme_21',
    number: 21,
    title: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil)',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil) [Indústria Têxtil]',
    briefing: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil) [Indústria Têxtil]'
  },
  {
    id: 'theme_22',
    number: 22,
    title: 'Impressão Digital Single-Pass & Substituição da Rotativa',
    category: 'Indústria Têxtil',
    summary: 'Impressão Digital Single-Pass & Substituição da Rotativa [Indústria Têxtil]',
    briefing: 'Impressão Digital Single-Pass & Substituição da Rotativa [Indústria Têxtil]'
  },
  {
    id: 'theme_23',
    number: 23,
    title: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica',
    category: 'Indústria Têxtil',
    summary: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica [Indústria Têxtil]',
    briefing: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica [Indústria Têxtil]'
  },
  {
    id: 'theme_24',
    number: 24,
    title: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem',
    category: 'Indústria Têxtil',
    summary: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem [Indústria Têxtil]',
    briefing: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem [Indústria Têxtil]'
  },
  {
    id: 'theme_25',
    number: 25,
    title: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas',
    category: 'Indústria Têxtil',
    summary: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas [Indústria Têxtil]',
    briefing: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas [Indústria Têxtil]'
  },
  {
    id: 'theme_26',
    number: 26,
    title: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas [Indústria Têxtil]',
    briefing: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas [Indústria Têxtil]'
  },
  {
    id: 'theme_27',
    number: 27,
    title: 'Tintas Condutivas Transparentes para Vestuário Eletrônico',
    category: 'Indústria Têxtil',
    summary: 'Tintas Condutivas Transparentes para Vestuário Eletrônico [Indústria Têxtil]',
    briefing: 'Tintas Condutivas Transparentes para Vestuário Eletrônico [Indústria Têxtil]'
  },
  {
    id: 'theme_28',
    number: 28,
    title: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance',
    category: 'Indústria Têxtil',
    summary: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance [Indústria Têxtil]',
    briefing: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance [Indústria Têxtil]'
  },
  {
    id: 'theme_29',
    number: 29,
    title: 'Impressão Sublimática de Grande Formato para Decoração e Moda',
    category: 'Indústria Têxtil',
    summary: 'Impressão Sublimática de Grande Formato para Decoração e Moda [Indústria Têxtil]',
    briefing: 'Impressão Sublimática de Grande Formato para Decoração e Moda [Indústria Têxtil]'
  },
  {
    id: 'theme_30',
    number: 30,
    title: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas',
    category: 'Indústria Têxtil',
    summary: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas [Indústria Têxtil]',
    briefing: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas [Indústria Têxtil]'
  },
  {
    id: 'theme_31',
    number: 31,
    title: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia',
    category: 'Indústria Têxtil',
    summary: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia [Indústria Têxtil]',
    briefing: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia [Indústria Têxtil]'
  },
  {
    id: 'theme_32',
    number: 32,
    title: 'Personalização em Massa Algorítmica na Estamparia de Vestuário',
    category: 'Indústria Têxtil',
    summary: 'Personalização em Massa Algorítmica na Estamparia de Vestuário [Indústria Têxtil]',
    briefing: 'Personalização em Massa Algorítmica na Estamparia de Vestuário [Indústria Têxtil]'
  },
  {
    id: 'theme_33',
    number: 33,
    title: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada',
    category: 'Indústria Têxtil',
    summary: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada [Indústria Têxtil]',
    briefing: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada [Indústria Têxtil]'
  },
  {
    id: 'theme_34',
    number: 34,
    title: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta',
    category: 'Indústria Têxtil',
    summary: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta [Indústria Têxtil]',
    briefing: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta [Indústria Têxtil]'
  },
  {
    id: 'theme_35',
    number: 35,
    title: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica',
    category: 'Indústria Têxtil',
    summary: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica [Indústria Têxtil]',
    briefing: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica [Indústria Têxtil]'
  },
  {
    id: 'theme_36',
    number: 36,
    title: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital',
    category: 'Indústria Têxtil',
    summary: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital [Indústria Têxtil]',
    briefing: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital [Indústria Têxtil]'
  },
  {
    id: 'theme_37',
    number: 37,
    title: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água',
    category: 'Indústria Têxtil',
    summary: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água [Indústria Têxtil]',
    briefing: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água [Indústria Têxtil]'
  },
  {
    id: 'theme_38',
    number: 38,
    title: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume',
    category: 'Indústria Têxtil',
    summary: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume [Indústria Têxtil]',
    briefing: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume [Indústria Têxtil]'
  },
  {
    id: 'theme_39',
    number: 39,
    title: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil)',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil) [Indústria Têxtil]',
    briefing: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil) [Indústria Têxtil]'
  },
  {
    id: 'theme_40',
    number: 40,
    title: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital',
    category: 'Indústria Têxtil',
    summary: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital [Indústria Têxtil]',
    briefing: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital [Indústria Têxtil]'
  }
]);

module.exports = { TECH_THEMES };


