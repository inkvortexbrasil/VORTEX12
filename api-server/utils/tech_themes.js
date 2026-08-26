/**
 * tech_themes.js — Banco de 21 Eixos Tecnológicos de Vanguarda
 * Indústria Gráfica, Têxtil, Eletrônica Impressa e Embalagens Inteligentes (InkVortex Brasil)
 */

const TECH_THEMES = Object.freeze([
  {
    id: 'theme_01',
    number: 1,
    title: 'Eletrônica Impressa & Sensores Híbridos',
    category: 'Eletrônica Funcional',
    summary: 'Eletrônica Impressa & Sensores Híbridos [Eletrônica Funcional]',
    briefing: 'Eletrônica Impressa & Sensores Híbridos [Eletrônica Funcional]'
  },
  {
    id: 'theme_02',
    number: 2,
    title: 'Passaporte Digital de Produto & Embalagens Conectadas',
    category: 'Rastreabilidade & Smart Packaging',
    summary: 'Passaporte Digital de Produto & Embalagens Conectadas [Rastreabilidade & Smart Packaging]',
    briefing: 'Passaporte Digital de Produto & Embalagens Conectadas [Rastreabilidade & Smart Packaging]'
  },
  {
    id: 'theme_03',
    number: 3,
    title: 'Cura Fotônica Avançada',
    category: 'Processos Fotoquímicos',
    summary: 'Cura Fotônica Avançada [Processos Fotoquímicos]',
    briefing: 'Cura Fotônica Avançada [Processos Fotoquímicos]'
  },
  {
    id: 'theme_04',
    number: 4,
    title: 'Cores Estruturais & Biomimética Fotônica',
    category: 'Nanotecnologia Óptica',
    summary: 'Cores Estruturais & Biomimética Fotônica [Nanotecnologia Óptica]',
    briefing: 'Cores Estruturais & Biomimética Fotônica [Nanotecnologia Óptica]'
  },
  {
    id: 'theme_05',
    number: 5,
    title: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas',
    category: 'Robótica & Impressão 3D',
    summary: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas [Robótica & Impressão 3D]',
    briefing: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas [Robótica & Impressão 3D]'
  },
  {
    id: 'theme_06',
    number: 6,
    title: 'Inteligência Artificial Preditiva & Controle Espectral Inline',
    category: 'Automação & Visão Computacional',
    summary: 'Inteligência Artificial Preditiva & Controle Espectral Inline [Automação & Visão Computacional]',
    briefing: 'Inteligência Artificial Preditiva & Controle Espectral Inline [Automação & Visão Computacional]'
  },
  {
    id: 'theme_07',
    number: 7,
    title: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada',
    category: 'Materiais Sustentáveis',
    summary: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada [Materiais Sustentáveis]',
    briefing: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada [Materiais Sustentáveis]'
  },
  {
    id: 'theme_08',
    number: 8,
    title: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral',
    category: 'Nanomateriais & Segurança',
    summary: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral [Nanomateriais & Segurança]',
    briefing: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral [Nanomateriais & Segurança]'
  },
  {
    id: 'theme_09',
    number: 9,
    title: 'Telas Transparentes & Displays Flexíveis Impressos',
    category: 'Optoeletrônica Impressa',
    summary: 'Telas Transparentes & Displays Flexíveis Impressos [Optoeletrônica Impressa]',
    briefing: 'Telas Transparentes & Displays Flexíveis Impressos [Optoeletrônica Impressa]'
  },
  {
    id: 'theme_10',
    number: 10,
    title: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro',
    category: 'Vidros & Cerâmicas Industriais',
    summary: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro [Vidros & Cerâmicas Industriais]',
    briefing: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro [Vidros & Cerâmicas Industriais]'
  },
  {
    id: 'theme_11',
    number: 11,
    title: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos',
    category: 'Eletrônica Verde',
    summary: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos [Eletrônica Verde]',
    briefing: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos [Eletrônica Verde]'
  },
  {
    id: 'theme_12',
    number: 12,
    title: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis',
    category: 'Biotecnologia & Saúde',
    summary: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis [Biotecnologia & Saúde]',
    briefing: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis [Biotecnologia & Saúde]'
  },
  {
    id: 'theme_13',
    number: 13,
    title: 'Manufatura Aditiva Funcional & Texturização Háptica',
    category: 'Acabamento Tátil & Braille',
    summary: 'Manufatura Aditiva Funcional & Texturização Háptica [Acabamento Tátil & Braille]',
    briefing: 'Manufatura Aditiva Funcional & Texturização Háptica [Acabamento Tátil & Braille]'
  },
  {
    id: 'theme_14',
    number: 14,
    title: 'Tintas Dinâmicas & Resposta a Estímulos',
    category: 'Tintas Inteligentes',
    summary: 'Tintas Dinâmicas & Resposta a Estímulos [Tintas Inteligentes]',
    briefing: 'Tintas Dinâmicas & Resposta a Estímulos [Tintas Inteligentes]'
  },
  {
    id: 'theme_15',
    number: 15,
    title: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos',
    category: 'Energia Renovável',
    summary: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos [Energia Renovável]',
    briefing: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos [Energia Renovável]'
  },
  {
    id: 'theme_16',
    number: 16,
    title: 'Nanoimprint Lithography Industrial para Óptica e Microholografia',
    category: 'Nanoestruturação de Superfície',
    summary: 'Nanoimprint Lithography Industrial para Óptica e Microholografia [Nanoestruturação de Superfície]',
    briefing: 'Nanoimprint Lithography Industrial para Óptica e Microholografia [Nanoestruturação de Superfície]'
  },
  {
    id: 'theme_17',
    number: 17,
    title: 'Cura por Feixe de Elétrons sem Fotoiniciadores',
    category: 'Embalagens Alimentícias',
    summary: 'Cura por Feixe de Elétrons sem Fotoiniciadores [Embalagens Alimentícias]',
    briefing: 'Cura por Feixe de Elétrons sem Fotoiniciadores [Embalagens Alimentícias]'
  },
  {
    id: 'theme_18',
    number: 18,
    title: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono',
    category: 'Nanomateriais Condutivos',
    summary: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono [Nanomateriais Condutivos]',
    briefing: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono [Nanomateriais Condutivos]'
  },
  {
    id: 'theme_19',
    number: 19,
    title: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada',
    category: 'Economia Circular',
    summary: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada [Economia Circular]',
    briefing: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada [Economia Circular]'
  },
  {
    id: 'theme_20',
    number: 20,
    title: 'Gêmeo Digital & Indústria Gráfica 5.0',
    category: 'Indústria 4.0 / 5.0',
    summary: 'Gêmeo Digital & Indústria Gráfica 5.0 [Indústria 4.0 / 5.0]',
    briefing: 'Gêmeo Digital & Indústria Gráfica 5.0 [Indústria 4.0 / 5.0]'
  },
  {
    id: 'theme_21',
    number: 21,
    title: 'Impressão Têxtil Digital & Estamparia de Vanguarda',
    category: 'Impressão Têxtil Industrial',
    summary: 'Impressão Têxtil Digital & Estamparia de Vanguarda [Impressão Têxtil Industrial]',
    briefing: 'Impressão Têxtil Digital & Estamparia de Vanguarda [Impressão Têxtil Industrial]'
  },
  {
    id: 'theme_22',
    number: 22,
    title: 'Tema Livre / Personalizado',
    category: 'Tema Livre',
    summary: 'Tema Livre / Personalizado [Tema Livre]',
    briefing: 'Tema Livre / Personalizado [Tema Livre]'
  }
]);

module.exports = { TECH_THEMES };


