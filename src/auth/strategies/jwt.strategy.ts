import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'tu-secreto-seguro',
    });
  }

  async validate(payload: any) {
    // Log para debug - puedes quitarlo después
    console.log('🔍 Payload recibido:', JSON.stringify(payload, null, 2));

    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    // 🔒 VALIDAR session_version
    const user = await this.trabajadorRepository.findOne({
      where: { id: payload.sub },
      relations: ['rol', 'institucion'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // 🔒 Comparar versión del token con la versión actual en BD
    const tokenVersion = payload.session_version || 0;
    const dbVersion = user.session_version || 1;

    if (tokenVersion !== dbVersion) {
      console.log(`🔒 Sesión inválida detectada para ${user.username}. Token: ${tokenVersion}, DB: ${dbVersion}`);

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Tu sesión ha expirado porque iniciaste sesión en otro dispositivo',
        code: 'SESSION_EXPIRED', // 🔒 Código específico para el frontend
      });
    }

    // Construye el objeto user desde el payload
    const userResponse = {
      id: payload.sub,
      username: payload.username,
      nombres: payload.nombres,           // ✅ Para auditoría
      apellidos: payload.apellidos,       // ✅ Para auditoría
      rol: payload.rol,                   // Objeto completo con { id, nombre, ... }
      institucion_id: payload.institucion_id,
      cargo: payload.cargo || null,       // ✅ Para control de jefa terapeuta
    };

    console.log('👤 User que se retorna:', JSON.stringify(userResponse, null, 2));
    console.log('🎭 Rol nombre:', userResponse.rol?.nombre);

    return userResponse;
  }
}