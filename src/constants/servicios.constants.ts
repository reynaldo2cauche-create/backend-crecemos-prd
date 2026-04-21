export const AREAS = {
  INFANTIL_ADOLESCENTES: 1,
  ADULTOS: 2
} as const;

export const SERVICIOS = {
  // Área Infantil y Adolescentes (area_id: 1)
  TERAPIA_LENGUAJE_INFANTIL: 1,
  TERAPIA_OCUPACIONAL: 2,
  TERAPIA_APRENDIZAJE: 3,
  PSICOLOGIA_INFANTIL: 4,
  EVALUACION_PSICOLOGICA_COLEGIO: 5,
  ORIENTACION_VOCACIONAL: 6,
  
  // Área Adultos (area_id: 2)
  PSICOTERAPIA_INDIVIDUAL: 7,
  TERAPIA_PAREJA: 8, // Este es el que activará la funcionalidad de pareja
  TERAPIA_FAMILIAR: 9,
  TERAPIA_LENGUAJE_ADULTOS: 10
} as const;

export const SERVICIOS_CONFIG = {
  [SERVICIOS.TERAPIA_LENGUAJE_INFANTIL]: {
    id: 1,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Terapia de Lenguaje',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.TERAPIA_OCUPACIONAL]: {
    id: 2,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Terapia Ocupacional',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.TERAPIA_APRENDIZAJE]: {
    id: 3,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Terapia de Aprendizaje',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.PSICOLOGIA_INFANTIL]: {
    id: 4,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Psicología',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.EVALUACION_PSICOLOGICA_COLEGIO]: {
    id: 5,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Evaluación Psicológica para Colegio',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.ORIENTACION_VOCACIONAL]: {
    id: 6,
    area_id: AREAS.INFANTIL_ADOLESCENTES,
    nombre: 'Orientación Vocacional',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.PSICOTERAPIA_INDIVIDUAL]: {
    id: 7,
    area_id: AREAS.ADULTOS,
    nombre: 'Psicoterapia Individual',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.TERAPIA_PAREJA]: {
    id: 8,
    area_id: AREAS.ADULTOS,
    nombre: 'Terapia de Pareja',
    activo: true,
    requiere_pareja: true // ✅ Este servicio requiere pareja
  },
  [SERVICIOS.TERAPIA_FAMILIAR]: {
    id: 9,
    area_id: AREAS.ADULTOS,
    nombre: 'Terapia Familiar',
    activo: true,
    requiere_pareja: false
  },
  [SERVICIOS.TERAPIA_LENGUAJE_ADULTOS]: {
    id: 10,
    area_id: AREAS.ADULTOS,
    nombre: 'Terapia de Lenguaje',
    activo: true,
    requiere_pareja: false
  }
} as const;

// Función helper para verificar si un servicio requiere pareja
export function requierePareja(servicioId: number): boolean {
  return SERVICIOS_CONFIG[servicioId as keyof typeof SERVICIOS_CONFIG]?.requiere_pareja || false;
}

// Función helper para obtener información del servicio
export function getServicioInfo(servicioId: number) {
  return SERVICIOS_CONFIG[servicioId as keyof typeof SERVICIOS_CONFIG];
} 