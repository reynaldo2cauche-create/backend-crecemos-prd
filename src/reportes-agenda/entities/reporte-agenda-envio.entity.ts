import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

/**
 * Candado diario del reporte de agenda. La clave primaria es la fecha (YYYY-MM-DD),
 * así el motor garantiza un único registro por día: si dos instancias del backend
 * disparan el @Cron a la vez, solo la primera logra el INSERT y envía el correo;
 * la segunda recibe ER_DUP_ENTRY y se omite.
 */
@Entity('reporte_agenda_envio')
export class ReporteAgendaEnvio {
  @PrimaryColumn({ type: 'date' })
  fecha: string;

  @CreateDateColumn({ type: 'timestamp' })
  enviado_en: Date;
}
