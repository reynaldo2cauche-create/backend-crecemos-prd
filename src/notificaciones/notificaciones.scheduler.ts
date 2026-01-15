import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionesService } from './notificaciones.service';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Paciente } from '../pacientes/paciente.entity';

@Injectable()
export class NotificacionesScheduler {
  private readonly logger = new Logger(NotificacionesScheduler.name);
  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadoresRepo: Repository<TrabajadorCentro>,
    @InjectRepository(Paciente)
    private pacientesRepo: Repository<Paciente>,
    private notificacionesService: NotificacionesService,
  ) {}

  iniciar() {
    this.logger.log('🔔 Scheduler de notificaciones iniciado');
    this.verificarNotificaciones();
    this.intervalId = setInterval(() => {
      this.verificarNotificaciones();
    }, 3600000);
  }

  detener() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('🔕 Scheduler de notificaciones detenido');
    }
  }

  private async verificarNotificaciones() {
    this.logger.log('🔍 Verificando notificaciones programadas...');

    try {
      await Promise.all([
        this.verificarAniversariosLaborales(),
        this.verificarCumpleaniosPacientes(),
      ]);

      this.logger.log('✅ Verificación completada');
    } catch (error) {
      this.logger.error(`❌ Error en verificación: ${error.message}`);
    }
  }

  private async verificarAniversariosLaborales() {
    try {
      const query = `
        SELECT
          tc.id,
          tc.nombres,
          tc.apellidos,
          tc.fecha_ingreso,
          tc.cargo_id,
          c.nombre as cargo_nombre,
          YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) as anos_servicio
        FROM trabajador_centro tc
        LEFT JOIN cargos c ON c.id = tc.cargo_id
        WHERE tc.estado = 1
          AND tc.fecha_ingreso IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(tc.fecha_ingreso, INTERVAL YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) YEAR),
            CURDATE()
          ) = 7
          AND YEAR(CURDATE()) > YEAR(tc.fecha_ingreso)
      `;

      const empleados = await this.trabajadoresRepo.query(query);

      for (const empleado of empleados) {
        const existeNotificacion = await this.verificarAniversarioExistente(
          empleado.id,
          new Date().toISOString().split('T')[0]
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
          const fechaIngreso = new Date(empleado.fecha_ingreso).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarAniversarioLaboral(
            empleado.id,
            nombreCompleto,
            fechaIngreso,
            empleado.anos_servicio,
            empleado.cargo_nombre || 'No especificado',
            1,
          );

          this.logger.log(`📅 Notificación de aniversario creada para ${nombreCompleto} (${empleado.anos_servicio} años)`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar aniversarios: ${error.message}`);
    }
  }

  private async verificarCumpleaniosPacientes() {
    try {
      await this.verificarCumpleaniosEnDias(2, [1]); // 2 días antes para ADMIN
      await this.verificarCumpleaniosEnDias(1, [2]); // 1 día antes para ADMISIÓN
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños: ${error.message}`);
    }
  }

  private async verificarCumpleaniosEnDias(dias: number, roles: number[]) {
    try {
      const query = `
        SELECT
          id,
          nombres,
          apellido_paterno,
          apellido_materno,
          fecha_nacimiento,
          YEAR(CURDATE()) - YEAR(fecha_nacimiento) + 1 as edad_cumplira
        FROM paciente
        WHERE fecha_nacimiento IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(fecha_nacimiento, INTERVAL YEAR(CURDATE()) - YEAR(fecha_nacimiento) YEAR),
            CURDATE()
          ) = ?
      `;

      const pacientes = await this.pacientesRepo.query(query, [dias]);

      for (const paciente of pacientes) {
        const existeNotificacion = await this.verificarCumpleanosExistente(
          paciente.id,
          new Date().toISOString().split('T')[0],
          roles
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
          const fechaNacimiento = new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarCumpleanospPaciente(
            paciente.id,
            nombreCompleto,
            fechaNacimiento,
            paciente.edad_cumplira,
            1,
            roles,
          );

          this.logger.log(`🎂 Notificación de cumpleaños creada para ${nombreCompleto} (${dias} días antes) - Roles: [${roles.join(', ')}]`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños en ${dias} días: ${error.message}`);
    }
  }

  /**
   * Verifica si ya existe una notificación de ANIVERSARIO para un empleado en una fecha
   */
  private async verificarAniversarioExistente(
    empleadoId: number,
    fecha: string,
  ): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        WHERE e.tipo_evento = 'ANIVERSARIO_LABORAL'
          AND JSON_EXTRACT(e.datos_adicionales, '$.empleado_id') = ?
          AND DATE(e.fecha_evento) = ?
      `;

      const result = await this.trabajadoresRepo.query(query, [empleadoId, fecha]);
      const existe = parseInt(result[0].total) > 0;
      
      if (existe) {
        this.logger.debug(`Ya existe notificación de aniversario para empleado ${empleadoId} en ${fecha}`);
      }
      
      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar aniversario existente: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica si ya existe una notificación de CUMPLEAÑOS para un paciente en una fecha y roles
   */
  private async verificarCumpleanosExistente(
    pacienteId: number,
    fecha: string,
    roles: number[],
  ): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        WHERE e.tipo_evento = 'CUMPLEANOS_PACIENTE'
          AND JSON_EXTRACT(e.datos_adicionales, '$.paciente_id') = ?
          AND DATE(e.fecha_evento) = ?
          AND nd.rol_id IN (${roles.join(',')})
        GROUP BY e.id
      `;

      const result = await this.trabajadoresRepo.query(query, [pacienteId, fecha]);
      const existe = result.length > 0;
      
      if (existe) {
        this.logger.debug(`Ya existe notificación de cumpleaños para paciente ${pacienteId} en ${fecha} para roles [${roles.join(', ')}]`);
      }
      
      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños existente: ${error.message}`);
      return false;
    }
  }
}