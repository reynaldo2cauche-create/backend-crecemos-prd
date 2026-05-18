import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesScheduler } from './notificaciones.scheduler';
import { EventoSistema } from './entities/evento-sistema.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionDestino } from './entities/notificacion-destino.entity';
import { NotificacionLeida } from './entities/notificacion-leida.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { SeguimientoAsistencia } from 'src/citas/entities/seguimiento-asistencia.entity';
import { Tarea } from '../tareas/entities/tarea.entity';
import { TareaAsignacion } from '../tareas/entities/tarea-asignacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventoSistema,
      Notificacion,
      NotificacionDestino,
      NotificacionLeida,
      TrabajadorCentro,
      Paciente,
      SeguimientoAsistencia,
      Tarea,
      TareaAsignacion,
    ]),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesScheduler],
  exports: [NotificacionesService], // Exportar para usar en otros módulos
})
export class NotificacionesModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly scheduler: NotificacionesScheduler) {}

  /**
   * Se ejecuta cuando el módulo se inicializa
   * Aquí iniciamos el scheduler de notificaciones
   */
  onModuleInit() {
    this.scheduler.iniciar();
  }

  /**
   * Se ejecuta cuando el módulo se destruye
   * Aquí detenemos el scheduler
   */
  onModuleDestroy() {
    this.scheduler.detener();
  }
}
