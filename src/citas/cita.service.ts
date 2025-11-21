import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cita } from './cita.entity';
import { HistorialCita } from './historial-cita.entity';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>,
    @InjectRepository(HistorialCita)
    private historialCitaRepository: Repository<HistorialCita>,
  ) {}

  /**
   * Crear una o múltiples citas
   */
  async create(createCitaDto: CreateCitaDto | CreateCitaDto[]): Promise<any> {
    // Si es un array, crear múltiples citas
    if (Array.isArray(createCitaDto)) {
      return this.createMultiple(createCitaDto);
    }

    // Si es un solo objeto, crear una cita
    return this.createSingle(createCitaDto);
  }

  /**
   * Crear una sola cita
   */
  private async createSingle(createCitaDto: CreateCitaDto): Promise<any> {
    // Calcular hora_fin basada en hora_inicio + duracion_minutos
    const horaInicio = new Date(`2000-01-01T${createCitaDto.hora_inicio}`);
    const horaFin = new Date(horaInicio.getTime() + createCitaDto.duracion_minutos * 60000);
    const horaFinString = horaFin.toTimeString().slice(0, 8);

    // Validar disponibilidad del terapeuta
    await this.validarDisponibilidadTerapeuta(
      createCitaDto.doctor_id,
      createCitaDto.fecha,
      createCitaDto.hora_inicio,
      horaFinString
    );

    const cita = this.citaRepository.create({
      ...createCitaDto,
      paciente: { id: createCitaDto.paciente_id },
      doctor: { id: createCitaDto.doctor_id },
      servicio: { id: createCitaDto.servicio_id },
      motivo: { id: createCitaDto.motivo_id },
      estado: { id: createCitaDto.estado_id },
      hora_fin: horaFinString,
      user_id_crea: createCitaDto.user_id
    });

    const savedCita = await this.citaRepository.save(cita);

    // Obtener la cita guardada con todas las relaciones
    const citaCompleta = await this.citaRepository.findOne({
      where: { id: savedCita.id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
    });

    // Registrar en el historial
    await this.registrarHistorial(citaCompleta, 'CREATE', createCitaDto.user_id);

    return {
      id: citaCompleta.id,
      paciente_id: citaCompleta.paciente.id,
      paciente_nombre: `${citaCompleta.paciente.nombres} ${citaCompleta.paciente.apellido_paterno} ${citaCompleta.paciente.apellido_materno}`.trim(),
      doctor_id: citaCompleta.doctor.id,
      doctor_nombre: `${citaCompleta.doctor.nombres} ${citaCompleta.doctor.apellidos}`.trim(),
      servicio_id: citaCompleta.servicio.id,
      servicio_nombre: citaCompleta.servicio.nombre,
      motivo_id: citaCompleta.motivo.id,
      motivo_nombre: citaCompleta.motivo.nombre,
      estado_id: citaCompleta.estado.id,
      estado_nombre: citaCompleta.estado.nombre,
      fecha: citaCompleta.fecha,
      hora_inicio: citaCompleta.hora_inicio,
      hora_fin: citaCompleta.hora_fin,
      duracion_minutos: citaCompleta.duracion_minutos,
      nota: citaCompleta.nota,
      user_id_crea: citaCompleta.user_id_crea,
      user_id_actua: citaCompleta.user_id_actua,
      fecha_actua: citaCompleta.fecha_actua,
      created_at: citaCompleta.created_at,
      updated_at: citaCompleta.updated_at
    };
  }

  /**
   * Crear múltiples citas
   */
  private async createMultiple(citasDto: CreateCitaDto[]): Promise<any> {
    const citasCreadas = [];
    const errores = [];

    // Validar todas las citas primero
    for (let i = 0; i < citasDto.length; i++) {
      const citaDto = citasDto[i];
      try {
        const horaInicio = new Date(`2000-01-01T${citaDto.hora_inicio}`);
        const horaFin = new Date(horaInicio.getTime() + citaDto.duracion_minutos * 60000);
        const horaFinString = horaFin.toTimeString().slice(0, 8);

        await this.validarDisponibilidadTerapeuta(
          citaDto.doctor_id,
          citaDto.fecha,
          citaDto.hora_inicio,
          horaFinString
        );
      } catch (error) {
        errores.push({
          index: i,
          fecha: citaDto.fecha,
          hora_inicio: citaDto.hora_inicio,
          error: error.message
        });
      }
    }

    // Si hay errores de validación, devolver todos los errores
    if (errores.length > 0) {
      throw new ConflictException({
        message: 'Hay conflictos de horarios en algunas citas',
        errores
      });
    }

    // Crear todas las citas
    for (const citaDto of citasDto) {
      const horaInicio = new Date(`2000-01-01T${citaDto.hora_inicio}`);
      const horaFin = new Date(horaInicio.getTime() + citaDto.duracion_minutos * 60000);
      const horaFinString = horaFin.toTimeString().slice(0, 8);

      const cita = this.citaRepository.create({
        ...citaDto,
        paciente: { id: citaDto.paciente_id },
        doctor: { id: citaDto.doctor_id },
        servicio: { id: citaDto.servicio_id },
        motivo: { id: citaDto.motivo_id },
        estado: { id: citaDto.estado_id },
        hora_fin: horaFinString,
        user_id_crea: citaDto.user_id
      });

      const savedCita = await this.citaRepository.save(cita);

      // Registrar en el historial
      const citaCompleta = await this.citaRepository.findOne({
        where: { id: savedCita.id },
        relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
      });

      await this.registrarHistorial(citaCompleta, 'CREATE', citaDto.user_id);

      citasCreadas.push({
        id: citaCompleta.id,
        paciente_id: citaCompleta.paciente.id,
        paciente_nombre: `${citaCompleta.paciente.nombres} ${citaCompleta.paciente.apellido_paterno} ${citaCompleta.paciente.apellido_materno}`.trim(),
        doctor_id: citaCompleta.doctor.id,
        doctor_nombre: `${citaCompleta.doctor.nombres} ${citaCompleta.doctor.apellidos}`.trim(),
        servicio_id: citaCompleta.servicio.id,
        servicio_nombre: citaCompleta.servicio.nombre,
        motivo_id: citaCompleta.motivo.id,
        motivo_nombre: citaCompleta.motivo.nombre,
        estado_id: citaCompleta.estado.id,
        estado_nombre: citaCompleta.estado.nombre,
        fecha: citaCompleta.fecha,
        hora_inicio: citaCompleta.hora_inicio,
        hora_fin: citaCompleta.hora_fin,
        duracion_minutos: citaCompleta.duracion_minutos,
        nota: citaCompleta.nota,
        user_id_crea: citaCompleta.user_id_crea,
        created_at: citaCompleta.created_at
      });
    }

    return {
      message: 'Citas creadas exitosamente',
      total: citasCreadas.length,
      citas: citasCreadas
    };
  }

  /**
   * Listar todas las citas con información completa
   * @param terapeutaId - ID del terapeuta para filtrar (opcional)
   */
  async findAll(terapeutaId?: number): Promise<any[]> {
    const whereCondition: any = {};
    
    if (terapeutaId) {
      whereCondition.doctor = { id: terapeutaId };
    }

    const citas = await this.citaRepository.find({
      where: whereCondition,
      relations: ['paciente', 'doctor', 'servicio', 'motivo'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' }
    });

    return citas.map(cita => ({
      id: cita.id,
      paciente_id: cita.paciente.id,
      paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
      doctor_id: cita.doctor.id,
      doctor_nombre: `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim(),
      servicio_id: cita.servicio.id,
      servicio_nombre: cita.servicio.nombre,
      motivo_id: cita.motivo.id,
      motivo_nombre: cita.motivo.nombre,
      estado_id: cita.estado.id,
      estado_nombre: cita.estado.nombre,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      estado: 'programada',
      nota: cita.nota,
      user_id_crea: cita.user_id_crea,
      user_id_actua: cita.user_id_actua,
      fecha_actua: cita.fecha_actua,
      created_at: cita.created_at,
      updated_at: cita.updated_at
    }));
  }

  /**
   * Buscar cita por ID
   */
  async findOne(id: number): Promise<any> {
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo']
    });

    if (!cita) {
      return null;
    }

    return {
      id: cita.id,
      paciente_id: cita.paciente.id,
      paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
      doctor_id: cita.doctor.id,
      doctor_nombre: `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim(),
      servicio_id: cita.servicio.id,
      servicio_nombre: cita.servicio.nombre,
      motivo_id: cita.motivo.id,
      motivo_nombre: cita.motivo.nombre,
      estado_id: cita.estado.id,
      estado_nombre: cita.estado.nombre,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      estado: 'programada',
      nota: cita.nota,
      user_id_crea: cita.user_id_crea,
      user_id_actua: cita.user_id_actua,
      fecha_actua: cita.fecha_actua,
      created_at: cita.created_at,
      updated_at: cita.updated_at
    };
  }

  /**
   * Actualizar cita
   */
  async update(id: number, updateCitaDto: UpdateCitaDto, userId?: number): Promise<Cita> {
    // Obtener la cita antes de actualizar para generar descripción de cambios
    const citaAnterior = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
    });

    if (!citaAnterior) {
      throw new BadRequestException('Cita no encontrada');
    }

    // Si se actualiza duración, recalcular hora_fin
    let horaFinCalculada = citaAnterior.hora_fin;
    if (updateCitaDto.duracion_minutos || updateCitaDto.hora_inicio) {
      const horaInicio = updateCitaDto.hora_inicio || citaAnterior.hora_inicio;
      const duracion = updateCitaDto.duracion_minutos || citaAnterior.duracion_minutos;
      const horaInicioDate = new Date(`2000-01-01T${horaInicio}`);
      const horaFinDate = new Date(horaInicioDate.getTime() + duracion * 60000);
      horaFinCalculada = horaFinDate.toTimeString().slice(0, 8);
      updateCitaDto.hora_fin = horaFinCalculada;
    }

    // Validar disponibilidad del terapeuta SOLO si realmente cambia doctor, fecha u horario
    const cambiaDoctor = updateCitaDto.doctor_id && updateCitaDto.doctor_id !== citaAnterior.doctor.id;
    const cambiaFecha = updateCitaDto.fecha && updateCitaDto.fecha !== citaAnterior.fecha;
    const cambiaHoraInicio = updateCitaDto.hora_inicio && updateCitaDto.hora_inicio !== citaAnterior.hora_inicio;
    const cambiaDuracion = updateCitaDto.duracion_minutos && updateCitaDto.duracion_minutos !== citaAnterior.duracion_minutos;
    
    const cambiaHorario = cambiaDoctor || cambiaFecha || cambiaHoraInicio || cambiaDuracion;
    
    if (cambiaHorario) {
      await this.validarDisponibilidadTerapeuta(
        updateCitaDto.doctor_id || citaAnterior.doctor.id,
        updateCitaDto.fecha || citaAnterior.fecha,
        updateCitaDto.hora_inicio || citaAnterior.hora_inicio,
        horaFinCalculada,
        id // Excluir la cita actual de la validación
      );
    }

    // Construir objeto de actualización excluyendo los IDs de relaciones
    const { paciente_id, doctor_id, servicio_id, motivo_id, estado_id, user_id, ...datosActualizacion } = updateCitaDto;
    
    await this.citaRepository.update(id, {
      ...datosActualizacion,
      paciente: paciente_id ? { id: paciente_id } : undefined,
      doctor: doctor_id ? { id: doctor_id } : undefined,
      servicio: servicio_id ? { id: servicio_id } : undefined,
      motivo: motivo_id ? { id: motivo_id } : undefined,
      estado: estado_id ? { id: estado_id } : undefined,
      user_id_actua: userId,
      fecha_actua: new Date()
    });

    // Obtener la cita actualizada
    const citaActualizada = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
    });

    // Generar descripción de cambios
    const cambios = this.generarDescripcionCambios(citaAnterior, citaActualizada, updateCitaDto);

    // Registrar en el historial
    await this.registrarHistorial(citaActualizada, 'UPDATE', userId, cambios);

    return this.findOne(id);
  }

  /**
   * Eliminar cita y su historial
   */
  async remove(id: number, userId?: number): Promise<any> {
    // Verificar que la cita existe
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
    });

    if (!cita) {
      throw new BadRequestException(`Cita con ID ${id} no encontrada`);
    }

    // Contar registros de historial que se eliminarán (por CASCADE)
    const historialCount = await this.historialCitaRepository.count({
      where: { cita_id: id }
    });

    // Guardar información para la respuesta
    const citaInfo = {
      id: cita.id,
      paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
      doctor_nombre: `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim(),
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      servicio_nombre: cita.servicio.nombre
    };

    // Eliminar la cita (el CASCADE eliminará automáticamente el historial)
    await this.citaRepository.delete(id);

    return {
      success: true,
      message: 'Cita eliminada exitosamente',
      cita_eliminada: citaInfo,
      registros_historial_eliminados: historialCount
    };
  }

  /**
   * Validar disponibilidad del terapeuta en el horario solicitado
   */
  private async validarDisponibilidadTerapeuta(
    doctorId: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    citaIdExcluir?: number
  ): Promise<void> {
    // Buscar citas del mismo terapeuta en la misma fecha
    const queryBuilder = this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.doctor_id = :doctorId', { doctorId })
      .andWhere('cita.fecha = :fecha', { fecha });
    
    // Excluir la cita actual si se está actualizando
    if (citaIdExcluir) {
      queryBuilder.andWhere('cita.id != :citaIdExcluir', { citaIdExcluir });
    }
    
    const citasExistentes = await queryBuilder.getMany();

    // Verificar si hay conflictos de horario
    for (const citaExistente of citasExistentes) {
      const conflicto = this.hayConflictoHorario(
        horaInicio,
        horaFin,
        citaExistente.hora_inicio,
        citaExistente.hora_fin
      );

      if (conflicto) {
        // Obtener información del terapeuta para el mensaje de error
        const citaConRelaciones = await this.citaRepository.findOne({
          where: { id: citaExistente.id },
          relations: ['doctor', 'paciente']
        });

        throw new ConflictException(
          `El terapeuta ${citaConRelaciones.doctor.nombres} ${citaConRelaciones.doctor.apellidos} ` +
          `ya tiene una cita programada de ${citaExistente.hora_inicio} a ${citaExistente.hora_fin} ` +
          `con el paciente ${citaConRelaciones.paciente.nombres} ${citaConRelaciones.paciente.apellido_paterno}. ` +
          `Por favor, seleccione otro horario.`
        );
      }
    }
  }

  /**
   * Verificar si dos rangos de horarios se solapan
   */
  private hayConflictoHorario(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string
  ): boolean {
    // Convertir strings de tiempo a minutos desde medianoche para comparar
    const convertirAMinutos = (tiempo: string): number => {
      const [horas, minutos, segundos] = tiempo.split(':').map(Number);
      return horas * 60 + minutos + (segundos || 0) / 60;
    };

    const inicio1Min = convertirAMinutos(inicio1);
    const fin1Min = convertirAMinutos(fin1);
    const inicio2Min = convertirAMinutos(inicio2);
    const fin2Min = convertirAMinutos(fin2);

    // Hay conflicto si:
    // - La nueva cita empieza antes de que termine la existente Y
    // - La nueva cita termina después de que empiece la existente
    return inicio1Min < fin2Min && fin1Min > inicio2Min;
  }

  /**
   * Registrar cambio en el historial
   */
  private async registrarHistorial(
    cita: Cita, 
    tipoOperacion: 'CREATE' | 'UPDATE' | 'DELETE', 
    usuarioId?: number,
    descripcionCambios?: string
  ): Promise<void> {
    const historial = this.historialCitaRepository.create({
      cita_id: cita.id,
      paciente: cita.paciente,
      doctor: cita.doctor,
      servicio: cita.servicio,
      motivo: cita.motivo,
      estado: cita.estado,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      nota: cita.nota,
      tipo_operacion: tipoOperacion,
      usuario_id: usuarioId,
      descripcion_cambios: descripcionCambios || this.generarDescripcionOperacion(tipoOperacion, cita)
    });

    await this.historialCitaRepository.save(historial);
  }

  /**
   * Generar descripción de la operación
   */
  private generarDescripcionOperacion(tipoOperacion: string, cita: Cita): string {
    const pacienteNombre = `${cita.paciente.nombres} ${cita.paciente.apellido_paterno}`.trim();
    const doctorNombre = `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim();
    
    switch (tipoOperacion) {
      case 'CREATE':
        return `Cita creada para ${pacienteNombre} con ${doctorNombre} el ${cita.fecha} a las ${cita.hora_inicio}`;
      case 'UPDATE':
        return `Cita modificada para ${pacienteNombre}`;
      case 'DELETE':
        return `Cita eliminada para ${pacienteNombre}`;
      default:
        return `Operación ${tipoOperacion} realizada`;
    }
  }

  /**
   * Generar descripción detallada de cambios
   */
  private generarDescripcionCambios(citaAnterior: Cita, citaActualizada: Cita, updateDto: UpdateCitaDto): string {
    const cambios: string[] = [];

    if (updateDto.paciente_id && citaAnterior.paciente.id !== citaActualizada.paciente.id) {
      cambios.push(`Paciente cambiado de "${citaAnterior.paciente.nombres} ${citaAnterior.paciente.apellido_paterno}" a "${citaActualizada.paciente.nombres} ${citaActualizada.paciente.apellido_paterno}"`);
    }

    if (updateDto.doctor_id && citaAnterior.doctor.id !== citaActualizada.doctor.id) {
      cambios.push(`Doctor cambiado de "${citaAnterior.doctor.nombres}" a "${citaActualizada.doctor.nombres}"`);
    }

    if (updateDto.servicio_id && citaAnterior.servicio.id !== citaActualizada.servicio.id) {
      cambios.push(`Servicio cambiado de "${citaAnterior.servicio.nombre}" a "${citaActualizada.servicio.nombre}"`);
    }

    if (updateDto.motivo_id && citaAnterior.motivo.id !== citaActualizada.motivo.id) {
      cambios.push(`Motivo cambiado de "${citaAnterior.motivo.nombre}" a "${citaActualizada.motivo.nombre}"`);
    }

    if (updateDto.estado_id && citaAnterior.estado.id !== citaActualizada.estado.id) {
      cambios.push(`Estado cambiado de "${citaAnterior.estado.nombre}" a "${citaActualizada.estado.nombre}"`);
    }

    if (updateDto.fecha && citaAnterior.fecha !== citaActualizada.fecha) {
      cambios.push(`Fecha cambiada de ${citaAnterior.fecha} a ${citaActualizada.fecha}`);
    }

    if (updateDto.hora_inicio && citaAnterior.hora_inicio !== citaActualizada.hora_inicio) {
      cambios.push(`Hora de inicio cambiada de ${citaAnterior.hora_inicio} a ${citaActualizada.hora_inicio}`);
    }

    if (updateDto.duracion_minutos && citaAnterior.duracion_minutos !== citaActualizada.duracion_minutos) {
      cambios.push(`Duración cambiada de ${citaAnterior.duracion_minutos} a ${citaActualizada.duracion_minutos} minutos`);
    }

    if (updateDto.nota !== undefined && citaAnterior.nota !== citaActualizada.nota) {
      cambios.push('Nota modificada');
    }

    return cambios.length > 0 ? cambios.join('; ') : 'Actualización de cita';
  }

  /**
   * Obtener historial de una cita específica
   */
  async obtenerHistorial(citaId: number): Promise<any[]> {
    const historial = await this.historialCitaRepository.find({
      where: { cita_id: citaId },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
      order: { fecha_registro: 'DESC' }
    });

    return historial.map(h => ({
      id: h.id,
      tipo_operacion: h.tipo_operacion,
      paciente_nombre: `${h.paciente.nombres} ${h.paciente.apellido_paterno} ${h.paciente.apellido_materno}`.trim(),
      doctor_nombre: `${h.doctor.nombres} ${h.doctor.apellidos}`.trim(),
      servicio_nombre: h.servicio.nombre,
      motivo_nombre: h.motivo.nombre,
      estado_nombre: h.estado.nombre,
      fecha: h.fecha,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      duracion_minutos: h.duracion_minutos,
      nota: h.nota,
      usuario_id: h.usuario_id,
      fecha_registro: h.fecha_registro,
      descripcion_cambios: h.descripcion_cambios
    }));
  }
}
