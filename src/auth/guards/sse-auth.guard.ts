import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard especial para Server-Sent Events (SSE)
 *
 * EventSource del navegador no puede enviar headers personalizados,
 * por lo que el token JWT debe venir como query parameter (?token=xxx)
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extraer token del query parameter
    const token = request.query.token;

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado en query parameter');
    }

    try {
      // Verificar y decodificar el token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'tu-secreto-seguro',
      });

      // Construir el objeto user igual que en JwtStrategy
      // IMPORTANTE: Usar tanto 'id' como 'userId' para compatibilidad
      request.user = {
        id: payload.sub,
        userId: payload.sub,
        username: payload.username,
        nombres: payload.nombres,
        apellidos: payload.apellidos,
        rol: payload.rol,
        institucion_id: payload.institucion_id,
      };

      console.log('✅ SSE Auth Guard: Usuario autenticado -', request.user.username);

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
