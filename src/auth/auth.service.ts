import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.trabajadorRepository.findOne({
      where: { username },
      relations: ['institucion', 'rol', 'cargo'],
    });

    console.log('Usuario encontrado:', user);
    console.log('Password recibido:', password);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(
    username: string,
    password: string,
    ip: string,
    userAgent: string,
    coordenadas?: { latitud?: number; longitud?: number }
  ) {
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.estado) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // 🔒 Incrementar session_version para invalidar sesiones anteriores
    const nuevaVersion = (user.session_version || 0) + 1;

    const payload = {
      username: user.username,
      sub: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: user.rol,
      institucion_id: user.institucion?.id,
      session_version: nuevaVersion, // 🔒 Incluir versión de sesión en el JWT
      cargo: user.cargo ? {
        id: user.cargo.id,
        nombre: user.cargo.nombre,
        es_jefe: user.cargo.es_jefe,
      } : null,
    };

    // Actualizar último acceso y session_version
    await this.trabajadorRepository.update(user.id, {
      ultimo_acceso: new Date(),
      session_version: nuevaVersion, // 🔒 Invalidar sesiones anteriores
    });

    console.log(`🔒 Nueva sesión creada para ${user.username}. Version: ${nuevaVersion}`);

    // 📍 Registrar login en auditoría CON COORDENADAS GPS
    try {
      await this.auditoriaService.registrar({
        trabajadorId: user.id,
        modulo: 'AUTH',
        accion: 'LOGIN',
        descripcion: `${user.nombres} ${user.apellidos} inició sesión en el sistema`,
        ipAddress: ip,
        userAgent: userAgent,
        datosNuevos: null,
        // 📍 Agregar coordenadas GPS
        ...(coordenadas?.latitud && { latitud: coordenadas.latitud }),
        ...(coordenadas?.longitud && { longitud: coordenadas.longitud }),
      });

      if (coordenadas?.latitud && coordenadas?.longitud) {
        console.log(`✅ LOGIN registrado en auditoría con GPS: ${coordenadas.latitud}, ${coordenadas.longitud}`);
      } else {
        console.log('⚠️ LOGIN registrado en auditoría SIN coordenadas GPS');
      }
    } catch (error) {
      console.error('Error al registrar auditoría de login:', error);
      // No lanzar error para no afectar el login
    }

    // DESHABILITADO: Notificar acceso fuera de horario
    // try {
    //   const nombreCompleto = `${user.nombres} ${user.apellidos}`;
    //   const horaActual = new Date().toLocaleTimeString('es-ES', {
    //     hour: '2-digit',
    //     minute: '2-digit'
    //   });

    //   await this.notificacionesService.notificarAccesoFueraHorario(
    //     user.id,
    //     nombreCompleto,
    //     horaActual,
    //     ip,
    //     userAgent,
    //     user.id
    //   );
    // } catch (error) {
    //   console.error('Error al notificar acceso fuera de horario:', error);
    // }

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
        institucion: user.institucion,
        cargo: user.cargo ? {
          id: user.cargo.id,
          nombre: user.cargo.nombre,
          es_jefe: user.cargo.es_jefe,
        } : null,
      },
    };
  }
}
