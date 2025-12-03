import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

    // Construye el objeto user desde el payload
    const user = {
      id: payload.sub,
      username: payload.username,
      nombres: payload.nombres,           // ✅ Para auditoría
      apellidos: payload.apellidos,       // ✅ Para auditoría
      rol: payload.rol,                   // Objeto completo con { id, nombre, ... }
      institucion_id: payload.institucion_id,
    };

    console.log('👤 User que se retorna:', JSON.stringify(user, null, 2));
    console.log('🎭 Rol nombre:', user.rol?.nombre);

    return user;
  }
}