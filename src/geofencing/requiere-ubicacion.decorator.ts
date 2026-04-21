import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para marcar rutas que requieren validación de ubicación
 *
 * @example
 * @Get()
 * @RequiereUbicacion()
 * async obtenerPacientes() {
 *   // Esta ruta solo será accesible si el usuario está dentro del perímetro
 * }
 */
export const REQUIERE_UBICACION_KEY = 'requiereUbicacion';
export const RequiereUbicacion = () => SetMetadata(REQUIERE_UBICACION_KEY, true);
