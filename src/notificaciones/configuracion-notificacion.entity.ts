import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Configuración de tipos de notificaciones
 *
 * Esta tabla es el MAESTRO de tipos de notificaciones.
 * - El campo `tipo` define qué tipos de notificaciones existen
 * - El campo `activa` permite activar/desactivar tipos de notificaciones
 * - El campo `diasAnticipacion` controla cuántos días antes se notifica
 *
 * Para agregar un nuevo tipo de notificación:
 * 1. Insertar un nuevo registro en esta tabla
 * 2. Implementar la lógica en NotificacionesService
 * 3. NO es necesario modificar la tabla `notificaciones`
 */
@Entity('configuracion_notificaciones')
export class ConfiguracionNotificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  tipo: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'dias_anticipacion', type: 'int', default: 1 })
  diasAnticipacion: number;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'datetime' })
  fechaActualizacion: Date;
}
