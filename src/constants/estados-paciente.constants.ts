// Estados de pacientes
export const ESTADO_PACIENTE = {
  ESTADO_1: 1,
  ESTADO_2: 2,
  ESTADO_3: 3,
  ESTADO_4: 4,
  INACTIVO: 5
} as const;

// Estados que tienen acceso a beneficios
// Estados 1, 2, 3, 4 = Activos (pueden acceder a beneficios)
// Estado 5 = Inactivo (NO puede acceder a beneficios)
export const ESTADOS_CON_ACCESO_BENEFICIOS = [1, 2, 3, 4] as const;

// Función helper para verificar si un paciente tiene acceso a beneficios según su estado
export function tieneAccesoBeneficios(estadoPacienteId: number): boolean {
  return ESTADOS_CON_ACCESO_BENEFICIOS.includes(estadoPacienteId as any);
}
