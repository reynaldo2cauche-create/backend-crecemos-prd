// Nombres de columna de las respuestas de la Ficha de Seguimiento Psicológico (Conners).
// Debe coincidir con src/constants/fichaSeguimientoPsicologia.js del frontend y con la
// migración migracion-ficha-seguimiento-psicologia.sql. Cada reactivo = una columna.

// Reactivos valorados con la escala Conners (0=Nunca, 1=Sólo un poco, 2=Bastante, 3=Mucho).
// Se guardan como número 0..3 (NULL = sin responder).
export const ESCALA_COLS = [
  // Conducta en el salón de clases (1..21)
  'sc1', 'sc2', 'sc3', 'sc4', 'sc5', 'sc6', 'sc7', 'sc8', 'sc9', 'sc10',
  'sc11', 'sc12', 'sc13', 'sc14', 'sc15', 'sc16', 'sc17', 'sc18', 'sc19', 'sc20', 'sc21',
  // Participación en grupo (22..29)
  'pg1', 'pg2', 'pg3', 'pg4', 'pg5', 'pg6', 'pg7', 'pg8',
  // Actitud hacia la autoridad (30..39)
  'aa1', 'aa2', 'aa3', 'aa4', 'aa5', 'aa6', 'aa7', 'aa8', 'aa9', 'aa10',
];

// Campos de texto libre
export const TEXT_COLS = ['comentarios'];

// Todas las columnas de respuesta (para mapear el body y construir las respuestas)
export const RESPUESTA_COLS = [...ESCALA_COLS, ...TEXT_COLS];
