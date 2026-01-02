import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
// import { NotificacionesService } from '../notificaciones/notificaciones.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    private jwtService: JwtService,
    // @Inject(forwardRef(() => NotificacionesService))
    // private notificacionesService: NotificacionesService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {

    const user = await this.trabajadorRepository.findOne({
      where: { username },
      relations: ['institucion', 'rol']  // ✅ Agregada relación 'rol' para auditoría
    });
     console.log('Usuario encontrado:', user);
  console.log('Password recibido:', password);

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(username: string, password: string, ip: string, userAgent: string) {
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.estado) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const payload = {
      username: user.username,
      sub: user.id,
      nombres: user.nombres,        // ✅ Agregado para auditoría
      apellidos: user.apellidos,    // ✅ Agregado para auditoría
      rol: user.rol,                // ✅ Cambió de solo nombre a objeto completo
      institucion_id: user.institucion?.id
    };

    // Actualizar último acceso
    await this.trabajadorRepository.update(user.id, {
      ultimo_acceso: new Date()
    });

    // Notificar login fuera de horario
    try {
      // await this.notificacionesService.notificarLoginFueraHorario(user.id, ip, userAgent);
    } catch (error) {
      console.error('Error al notificar login fuera de horario:', error);
    }

    return {
      access_token: this.jwtService.sign(payload),
      expires_in: '24h',
      user: {
        id: user.id,
        username: user.username,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        email: user.email,
        especialidad: user.especialidad,
        institucion: user.institucion
      }
    };
  }
} 