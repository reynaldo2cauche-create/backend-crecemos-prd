// Nombres de columna de las respuestas de la Ficha de Seguimiento Escolar.
// Debe coincidir con src/constants/fichaSeguimientoEscolar.js del frontend y con la
// migración migracion-ficha-seguimiento-escolar.sql. Cada pregunta = una columna.

// Ítems con escala ENUM('L','EP','N'). Cada uno tiene además su columna `<col>_obs` (texto).
export const ESCALA_COLS = [
  'cf1', 'cf2', 'cf3', 'cf4', 'cf5', 'cf6',
  'cl1', 'cl2', 'cl3', 'cl4', 'cl5',
  've1', 've2', 've3', 've4', 've5',
  'is1', 'is2', 'is3', 'is4', 'is5', 'is6',
  'ji1', 'ji2', 'ji3', 'ji4', 'ji5',
];

export const OBS_COLS = ESCALA_COLS.map((c) => `${c}_obs`);

// Opciones marcables (booleanas)
export const BOOL_COLS = [
  // ¿Para qué utiliza el lenguaje?
  'usa_pedir_objetos', 'usa_pedir_ayuda', 'usa_rechazar', 'usa_elegir',
  'usa_llamar_persona', 'usa_responder_preguntas', 'usa_comentar_espontaneo',
  // Durante el juego libre
  'jl_juega_solo', 'jl_cerca_otros', 'jl_observa_imita', 'jl_permite_otros',
  'jl_busca_otros', 'jl_juegos_turnos',
  // Estrategias que mejor funcionan
  'est_pausa_expectante', 'est_frases_breves', 'est_una_indicacion', 'est_mostrar_visual',
  'est_modelar_palabra', 'est_materiales_interes', 'est_dos_alternativas',
  'est_incorporarse_juego', 'est_canciones_movimiento',
];

// Campos de texto libre
export const TEXT_COLS = [
  'palabras_espontaneas', 'frases_escuchadas', 'jl_ejemplo', 'usa_otro', 'est_otro',
];

// Todas las columnas de respuesta (para mapear el body y construir las respuestas)
export const RESPUESTA_COLS = [...ESCALA_COLS, ...OBS_COLS, ...BOOL_COLS, ...TEXT_COLS];
