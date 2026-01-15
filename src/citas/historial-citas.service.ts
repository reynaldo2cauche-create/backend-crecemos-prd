import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialCita } from './entities/historial-cita.entity';
import { HistorialCitaReunionTerapeutas } from './entities/historial-cita-reunion-terapeutas.entity';
import { HistorialCitaReunionServicios } from './entities/historial-cita-reunion-servicios.entity';
import { HistorialCitaVisitaEscolar } from './entities/historial-cita-visita-escolar.entity';
import { Cita } from './entities/cita.entity';
import { CitaReunionClinica } from './entities/cita-reunion-clinica.entity';
import { CitaVisitaEscolar } from './entities/cita-visita-escolar.entity';

@Injectable()
export class HistorialCitasService {
  constructor(
    @InjectRepository(HistorialCita)
    private historialRepo: Repository<HistorialCita>,
    @InjectRepository(HistorialCitaReunionTerapeutas)
    private historialTerapeutasRepo: Repository<HistorialCitaReunionTerapeutas>,
    @InjectRepository(HistorialCitaReunionServicios)
    private historialServiciosRepo: Repository<HistorialCitaReunionServicios>,
    @InjectRepository(HistorialCitaVisitaEscolar)
    private historialVisitaRepo: Repository<HistorialCitaVisitaEscolar>,
    @InjectRepository(Cita)
    private citaRepo: Repository<Cita>,
    @InjectRepository(CitaReunionClinica)
    private reunionRepo: Repository<CitaReunionClinica>,
    @InjectRepository(CitaVisitaEscolar)
    private visitaEscolarRepo: Repository<CitaVisitaEscolar>,
  ) {}

  /**
   * Registrar en el historial la operación realizada sobre una cita
   */
  async registrarHistorial(
    citaId: number,
    tipoOperacion: 'CREATE' | 'UPDATE' | 'DELETE',
    usuarioId: number,
    descripcionCambios?: string,
    motivoAccion?: string,
  ): Promise<void> {
    try {
      console.log(`📝 [HISTORIAL] Registrando: Cita ${citaId}, Operación ${tipoOperacion}, Usuario ${usuarioId}`);

      // 1. Obtener la cita completa
      const cita = await this.citaRepo.findOne({
        where: { id: citaId },
        relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
      });

      if (!cita) {
        console.log(`⚠️ [HISTORIAL] No se encontró la cita ${citaId} para registrar historial`);
        return;
      }

      console.log(`✅ [HISTORIAL] Cita encontrada: Paciente ID ${cita.paciente_id}`);

    // 2. Crear registro en historial_citas
    const historial = this.historialRepo.create({
      cita_id: cita.id,
      paciente_id: cita.paciente_id,
      doctor_id: cita.doctor_id,
      servicio_id: cita.servicio_id,
      motivo_id: cita.motivo_id,
      estado_id: cita.estado_id,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      nota: cita.nota,
      tipo_operacion: tipoOperacion,
      usuario_id: usuarioId,
      descripcion_cambios: descripcionCambios || this.generarDescripcionAutomatica(cita, tipoOperacion),
      motivo_accion: motivoAccion || null,
    });

      const historialGuardado = await this.historialRepo.save(historial);
     

      // 3. Verificar tipo de cita y guardar datos adicionales
      await this.guardarDatosAdicionales(cita.id, historialGuardado.id, usuarioId);


    } catch (error) {
      console.error(`❌ [HISTORIAL] Error al registrar historial:`, error);
      throw error;
    }
  }

  /**
   * Guardar datos adicionales según el tipo de cita
   */
  private async guardarDatosAdicionales(citaId: number, historialId: number, usuarioId: number): Promise<void> {
    // Verificar si es reunión clínica
    const reunion = await this.reunionRepo.findOne({
      where: { id: citaId },
      relations: ['terapeutas', 'servicios'],
    });

    if (reunion) {
      console.log(`📋 Guardando datos de REUNIÓN CLÍNICA en historial`);

      // Guardar terapeutas
      if (reunion.terapeutas && reunion.terapeutas.length > 0) {
        for (const terapeuta of reunion.terapeutas) {
          await this.historialTerapeutasRepo.save({
            historial_cita_id: historialId,
            terapeuta_id: terapeuta.id_terapeuta,
            user_id_crea: usuarioId,
          });
        }
        console.log(`✅ ${reunion.terapeutas.length} terapeutas guardados en historial`);
      }

      // Guardar servicios
      if (reunion.servicios && reunion.servicios.length > 0) {
        for (const servicio of reunion.servicios) {
          await this.historialServiciosRepo.save({
            historial_cita_id: historialId,
            servicio_id: servicio.id_servicio,
            user_id_crea: usuarioId,
          });
        }
        console.log(`✅ ${reunion.servicios.length} servicios guardados en historial`);
      }

      return;
    }

    // Verificar si es visita escolar
    const visita = await this.visitaEscolarRepo.findOne({
      where: { id_cita: citaId },
    });

    if (visita) {
      console.log(`🏫 Guardando datos de VISITA ESCOLAR en historial`);

      await this.historialVisitaRepo.save({
        historial_cita_id: historialId,
        nombre_colegio: visita.nombre_colegio,
        nombre_intermediario: visita.nombre_intermediario,
        telefono: visita.telefono,
        observaciones: visita.observaciones,
        user_id_crea: usuarioId,
      });

      console.log(`✅ Datos de visita escolar guardados en historial`);
    }
  }

  /**
   * Generar descripción automática del cambio
   */
  private generarDescripcionAutomatica(cita: Cita, tipoOperacion: string): string {
    const paciente = cita.paciente?.nombres || 'Paciente desconocido';
    const fecha = cita.fecha;
    const hora = cita.hora_inicio;

    switch (tipoOperacion) {
      case 'CREATE':
        return `Cita creada para ${paciente} el ${fecha} a las ${hora}`;
      case 'UPDATE':
        return `Cita actualizada para ${paciente} el ${fecha} a las ${hora}`;
      case 'DELETE':
        return `Cita eliminada para ${paciente} que estaba programada el ${fecha} a las ${hora}`;
      default:
        return 'Operación realizada sobre la cita';
    }
  }

  /**
   * Obtener historial de una cita específica
   */
  async obtenerHistorial(citaId: number): Promise<any[]> {
    console.log(`🔍 Obteniendo historial de cita ${citaId}`);

    const historial = await this.historialRepo.find({
      where: { cita_id: citaId },
      relations: [
        'paciente',
        'doctor',
        'servicio',
        'motivo',
        'motivo.tipoCita',
        'estado',
        'usuario',
        'terapeutas',
        'terapeutas.terapeuta',
        'servicios',
        'servicios.servicio',
        'visitasEscolares',
      ],
      order: { fecha_registro: 'DESC' },
    });

    console.log(`✅ Se encontraron ${historial.length} registros de historial`);

    return historial.map(h => {
      const tipoCita = h.motivo?.tipoCita?.codigo || 'NORMAL';

      // Datos base que siempre se muestran
      const resultado: any = {
        id: h.id,
        tipo_operacion: h.tipo_operacion,
        fecha_registro: h.fecha_registro,
        usuario: h.usuario ? {
          id: h.usuario_id,
          nombre: `${h.usuario.nombres} ${h.usuario.apellidos}`.trim(),
          email: h.usuario.email || null,
        } : {
          id: h.usuario_id,
          nombre: 'Usuario desconocido',
          email: null,
        },
        descripcion_cambios: h.descripcion_cambios,
        tipo_cita: tipoCita,

        // DATOS COMUNES A TODOS LOS TIPOS
        paciente: h.paciente ? {
          id: h.paciente_id,
          nombre_completo: `${h.paciente.nombres} ${h.paciente.apellido_paterno} ${h.paciente.apellido_materno}`.trim(),
          numero_documento: h.paciente.numero_documento,
        } : null,
        motivo: h.motivo?.nombre || 'N/A',
        estado: h.estado?.nombre || 'N/A',
        fecha: h.fecha,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        duracion_minutos: h.duracion_minutos,
        nota: h.nota,
      };

      // DATOS ESPECÍFICOS SEGÚN TIPO DE CITA
      if (tipoCita === 'NORMAL') {
        // CITA NORMAL: doctor y servicio
        resultado.terapeuta = h.doctor ? {
          id: h.doctor_id,
          nombre: `${h.doctor.nombres} ${h.doctor.apellidos}`.trim(),
        } : null;
        resultado.servicio = h.servicio ? {
          id: h.servicio_id,
          nombre: h.servicio.nombre,
        } : null;
      }
      else if (tipoCita === 'REUNION_CLINICA') {
        // REUNIÓN CLÍNICA: múltiples terapeutas y servicios
        resultado.terapeutas = h.terapeutas?.map(t => ({
          id: t.terapeuta_id,
          nombre: t.terapeuta ? `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim() : 'N/A',
        })) || [];
        resultado.servicios = h.servicios?.map(s => ({
          id: s.servicio_id,
          nombre: s.servicio?.nombre || 'N/A',
        })) || [];
      }
      else if (tipoCita === 'VISITA_ESCOLAR') {
        // VISITA ESCOLAR: terapeuta + datos del encargado
        resultado.terapeuta = h.doctor ? {
          id: h.doctor_id,
          nombre: `${h.doctor.nombres} ${h.doctor.apellidos}`.trim(),
        } : null;
        resultado.servicio = h.servicio ? {
          id: h.servicio_id,
          nombre: h.servicio.nombre,
        } : null;
        resultado.visita_escolar = h.visitasEscolares && h.visitasEscolares.length > 0 ? {
          nombre_colegio: h.visitasEscolares[0].nombre_colegio,
          nombre_intermediario: h.visitasEscolares[0].nombre_intermediario,
          telefono: h.visitasEscolares[0].telefono,
          observaciones: h.visitasEscolares[0].observaciones,
        } : null;
      }

      return resultado;
    });
  }
}
