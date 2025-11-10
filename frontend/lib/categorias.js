export const CAT_INFO = {
  1: 'Tamaño de la herida',
  2: 'Profundidad del tejido afectado',
  3: 'Bordes de la herida',
  4: 'Tipo de tejido necrótico',
  5: 'Cantidad de tejido necrótico',
  6: 'Tipo de exudado',
  7: 'Cantidad de exudado',
  8: 'Condición de la piel circundante',
};

// Ayudas/tooltip del PWAT (Photographic Wound Assessment Tool)
// Escala general: 0 = óptimo/ausente · 4 = severo/muy desfavorable
export const PWAT_HELP = {
  1: {
    title: 'Tamaño de la herida',
    desc: 'Área visible de la lesión en la fotografía (mayor tamaño suele indicar mayor complejidad).',
    scale: [
      '0: Cerrada/sin herida visible',
      '1: Pequeña',
      '2: Moderada',
      '3: Grande',
      '4: Muy grande/extensa',
    ],
  },
  2: {
    title: 'Profundidad del tejido afectado',
    desc: 'Compromiso tisular: desde superficial a estructuras profundas.',
    scale: [
      '0: Superficial/epidérmica',
      '1: Dermis',
      '2: Subcutáneo',
      '3: Exposición de fascia/músculo',
      '4: Exposición de hueso/estructuras profundas',
    ],
  },
  3: {
    title: 'Bordes de la herida',
    desc: 'Definición, adhesión y regularidad de los márgenes (bordes bien adheridos y regulares son mejores).',
    scale: [
      '0: Bien definidos y adheridos',
      '1: Ligeramente irregulares',
      '2: Irregulares/despegados en áreas',
      '3: Muy irregulares/despegados',
      '4: Socavados/epibole marcado',
    ],
  },
  4: {
    title: 'Tipo de tejido necrótico',
    desc: 'Calidad del tejido desvitalizado (fibrina/esfacelo/escara). Peor calidad implica mayor puntaje.',
    scale: [
      '0: No hay tejido necrótico',
      '1: Fibrina fina/amarillenta',
      '2: Esfacelos moderados',
      '3: Esfacelos densos',
      '4: Escara seca/negra adherida',
    ],
  },
  5: {
    title: 'Cantidad de tejido necrótico',
    desc: 'Proporción del lecho ocupada por tejido desvitalizado.',
    scale: [
      '0: 0%',
      '1: < 25%',
      '2: 25–50%',
      '3: 50–75%',
      '4: > 75%',
    ],
  },
  6: {
    title: 'Tipo de exudado',
    desc: 'Características del exudado (seroso → purulento).',
    scale: [
      '0: Ausente',
      '1: Seroso/traslúcido',
      '2: Serosanguinolento',
      '3: Sanguinolento/espeso',
      '4: Purulento/espeso y opaco',
    ],
  },
  7: {
    title: 'Cantidad de exudado',
    desc: 'Volumen presente en la herida/apósito.',
    scale: [
      '0: Seco/sin exudado',
      '1: Escaso',
      '2: Moderado',
      '3: Abundante',
      '4: Muy abundante',
    ],
  },
  8: {
    title: 'Condición de la piel circundante',
    desc: 'Integridad y signos de maceración/eritema alrededor de la herida.',
    scale: [
      '0: Integra, sin cambios',
      '1: Eritema leve',
      '2: Eritema/maceración moderada',
      '3: Maceración marcada/irritación',
      '4: Lesiones/dermatitis perilesional severa',
    ],
  },
};
