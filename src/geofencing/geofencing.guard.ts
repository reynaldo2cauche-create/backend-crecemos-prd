import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GeofencingService } from './geofencing.service';
import { REQUIERE_UBICACION_KEY } from './requiere-ubicacion.decorator';

/**
 * Guard que valida la ubicación del usuario antes de permitir acceso
 */
@Injectable()
export class GeofencingGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private geofencingService: GeofencingService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si la ruta requiere validación de ubicación
    const requiereUbicacion = this.reflector.getAllAndOverride<boolean>(
      REQUIERE_UBICACION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no requiere ubicación, permitir acceso
    if (!requiereUbicacion) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Usuario autenticado (viene del JWT)

    // 🔍 Verificar si el rol requiere geofencing
    // Solo aplicar a Terapeutas (id=4) y Admisión (id=2)
    const rolesQueRequierenGeofencing = [2, 4];

    if (!user || !rolesQueRequierenGeofencing.includes(user.rol_id)) {
      // Si no es terapeuta ni admisión, permitir acceso sin validar ubicación
      console.log(`✅ Usuario ${user?.id || 'desconocido'} no requiere geofencing (rol: ${user?.rol_id})`);
      return true;
    }

    // 📍 Obtener coordenadas del header
    const latHeader = request.headers['x-user-latitude'];
    const lngHeader = request.headers['x-user-longitude'];

    if (!latHeader || !lngHeader) {
      throw new BadRequestException({
        message: 'Se requiere ubicación para acceder a esta sección',
        code: 'UBICACION_REQUERIDA',
        details: 'Por favor, permite el acceso a tu ubicación GPS',
      });
    }

    const lat = parseFloat(latHeader);
    const lng = parseFloat(lngHeader);

    // Validar formato de coordenadas
    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException({
        message: 'Coordenadas inválidas',
        code: 'COORDENADAS_INVALIDAS',
      });
    }

    // Validar rango de coordenadas
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException({
        message: 'Coordenadas fuera de rango',
        code: 'COORDENADAS_FUERA_DE_RANGO',
      });
    }

    // 🔒 Verificar si está dentro del perímetro
    const dentroDelPerimetro = this.geofencingService.verificarPerimetro(
      lat,
      lng,
    );

    if (!dentroDelPerimetro) {
      const distancia = this.geofencingService.obtenerDistancia(lat, lng);
      const radioPermitido = this.geofencingService.obtenerRadioPermitido();

      console.log(`❌ Acceso denegado - Usuario ${user.id} fuera del perímetro`);
      console.log(`   - Distancia: ${distancia} metros`);
      console.log(`   - Radio permitido: ${radioPermitido} metros`);

      throw new ForbiddenException({
        message: 'Acceso denegado por ubicación',
        code: 'FUERA_DEL_PERIMETRO',
        details: {
          distancia,
          radioPermitido,
          mensaje: `Debes estar dentro de ${radioPermitido} metros del centro de labores para acceder a esta sección`,
        },
      });
    }

    console.log(`✅ Acceso permitido - Usuario ${user.id} dentro del perímetro`);
    return true;
  }
}
