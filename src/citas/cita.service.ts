import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cita } from './cita.entity';
import { HistorialCita } from './historial-cita.entity';
import { CitaTerapeuta } from './cita-terapeuta.entity';
import { CitaServicio } from './cita-servicio.entity';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { HistorialCitaTerapeuta } from './historial-cita-terapeuta.entity';
import { HistorialCitaServicio } from './historial-cita-servicio.entity';

@Injectable()
export class CitaService {
  constructor(
  @InjectRepository(Cita)
  private citaRepository: Repository<Cita>,
  @InjectRepository(HistorialCita)
  private historialCitaRepository: Repository<HistorialCita>,
  @InjectRepository(HistorialCitaTerapeuta)
  private historialCitaTerapeutaRepository: Repository<HistorialCitaTerapeuta>,
  @InjectRepository(HistorialCitaServicio)
  private historialCitaServicioRepository: Repository<HistorialCitaServicio>,
  @InjectRepository(CitaTerapeuta)
  private citaTerapeutaRepository: Repository<CitaTerapeuta>,
  @InjectRepository(CitaServicio)
  private citaServicioRepository: Repository<CitaServicio>,
) {}

  /**
   * Crear una o múltiples citas
   */
  async create(createCitaDto: CreateCitaDto | CreateCitaDto[]): Promise<any> {
    if (Array.isArray(createCitaDto)) {
      return this.createMultiple(createCitaDto);
    }
    return this.createSingle(createCitaDto);
  }

  /**
   * Crear una sola cita con múltiples terapeutas y servicios
   */
  private async createSingle(createCitaDto: CreateCitaDto): Promise<any> {
    // Calcular hora_fin
    const horaInicio = new Date(`2000-01-01T${createCitaDto.hora_inicio}`);
    const horaFin = new Date(horaInicio.getTime() + createCitaDto.duracion_minutos * 60000);
    const horaFinString = horaFin.toTimeString().slice(0, 8);

    // Validar disponibilidad del terapeuta principal
    await this.validarDisponibilidadTerapeuta(
      createCitaDto.doctor_id,
      createCitaDto.fecha,
      createCitaDto.hora_inicio,
      horaFinString
    );

    // Validar disponibilidad de terapeutas adicionales
    if (createCitaDto.terapeutas_adicionales?.length > 0) {
      for (const terapeutaId of createCitaDto.terapeutas_adicionales) {
        await this.validarDisponibilidadTerapeuta(
          terapeutaId,
          createCitaDto.fecha,
          createCitaDto.hora_inicio,
          horaFinString
        );
      }
    }

    // Crear la cita
    const cita = this.citaRepository.create({
      paciente: { id: createCitaDto.paciente_id },
      doctor: { id: createCitaDto.doctor_id },
      servicio: { id: createCitaDto.servicio_id },
      motivo: { id: createCitaDto.motivo_id },
      estado: { id: createCitaDto.estado_id },
      fecha: createCitaDto.fecha,
      hora_inicio: createCitaDto.hora_inicio,
      hora_fin: horaFinString,
      duracion_minutos: createCitaDto.duracion_minutos,
      nota: createCitaDto.nota,
      user_id_crea: createCitaDto.user_id
    });

    const savedCita = await this.citaRepository.save(cita);

    // Crear relación con el terapeuta principal
    await this.citaTerapeutaRepository.save({
      cita_id: savedCita.id,
      terapeuta_id: createCitaDto.doctor_id,
      rol_en_cita: 'principal'
    });

    // Crear relaciones con terapeutas adicionales
    if (createCitaDto.terapeutas_adicionales?.length > 0) {
      const terapeutasAdicionales = createCitaDto.terapeutas_adicionales.map(terapeutaId => ({
        cita_id: savedCita.id,
        terapeuta_id: terapeutaId,
        rol_en_cita: 'apoyo'
      }));
      await this.citaTerapeutaRepository.save(terapeutasAdicionales);
    }

    // Crear relaciones con servicios
    // Si hay servicios_adicionales, usar esos (reunión clínica)
    // Si no, usar el servicio_id (cita normal)
    const serviciosParaGuardar = [];

    if (createCitaDto.servicios_adicionales?.length > 0) {
      // Reunión clínica: guardar todos los servicios del array
      serviciosParaGuardar.push(...createCitaDto.servicios_adicionales.map(servicioId => ({
        cita_id: savedCita.id,
        servicio_id: servicioId
      })));
    } else {
      // Cita normal: guardar solo el servicio principal
      serviciosParaGuardar.push({
        cita_id: savedCita.id,
        servicio_id: createCitaDto.servicio_id
      });
    }

    await this.citaServicioRepository.save(serviciosParaGuardar);

    // Obtener la cita completa con todas las relaciones
    const citaCompleta = await this.citaRepository.findOne({
      where: { id: savedCita.id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios']
    });

    // Registrar en el historial
    await this.registrarHistorial(citaCompleta, 'CREATE', createCitaDto.user_id);

    return this.formatearCitaRespuesta(citaCompleta);
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

        // Validar terapeuta principal
        await this.validarDisponibilidadTerapeuta(
          citaDto.doctor_id,
          citaDto.fecha,
          citaDto.hora_inicio,
          horaFinString
        );

        // Validar terapeutas adicionales
        if (citaDto.terapeutas_adicionales?.length > 0) {
          for (const terapeutaId of citaDto.terapeutas_adicionales) {
            await this.validarDisponibilidadTerapeuta(
              terapeutaId,
              citaDto.fecha,
              citaDto.hora_inicio,
              horaFinString
            );
          }
        }
      } catch (error) {
        errores.push({
          index: i,
          fecha: citaDto.fecha,
          hora_inicio: citaDto.hora_inicio,
          error: error.message
        });
      }
    }

    if (errores.length > 0) {
      throw new ConflictException({
        message: 'Hay conflictos de horarios en algunas citas',
        errores
      });
    }

    // Crear todas las citas
    for (const citaDto of citasDto) {
      const citaCreada = await this.createSingle(citaDto);
      citasCreadas.push(citaCreada);
    }

    return {
      message: 'Citas creadas exitosamente',
      total: citasCreadas.length,
      citas: citasCreadas
    };
  }

  /**
   * Listar todas las citas
   */
  async findAll(terapeutaId?: number): Promise<any[]> {
    let citas: Cita[];

    if (terapeutaId) {
      // Buscar citas donde el terapeuta esté como principal o adicional
      const citasTerapeutas = await this.citaTerapeutaRepository.find({
        where: { terapeuta_id: terapeutaId },
        relations: ['cita']
      });

      const citaIds = citasTerapeutas.map(ct => ct.cita_id);

      if (citaIds.length === 0) {
        return [];
      }

      citas = await this.citaRepository.find({
        where: { id: In(citaIds) },
        relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios'],
        order: { fecha: 'ASC', hora_inicio: 'ASC' }
      });
    } else {
      citas = await this.citaRepository.find({
        relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios'],
        order: { fecha: 'ASC', hora_inicio: 'ASC' }
      });
    }

    return citas.map(cita => this.formatearCitaRespuesta(cita));
  }

  /**
   * Buscar cita por ID
   */
  async findOne(id: number): Promise<any> {
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios']
    });

    if (!cita) {
      return null;
    }

    return this.formatearCitaRespuesta(cita);
  }

  /**
   * Actualizar cita
   */
  async update(id: number, updateCitaDto: UpdateCitaDto, userId?: number): Promise<any> {
    const citaAnterior = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios']
    });

    if (!citaAnterior) {
      throw new BadRequestException('Cita no encontrada');
    }

    // Calcular hora_fin si es necesario
    let horaFinCalculada = citaAnterior.hora_fin;
    if (updateCitaDto.duracion_minutos || updateCitaDto.hora_inicio) {
      const horaInicio = updateCitaDto.hora_inicio || citaAnterior.hora_inicio;
      const duracion = updateCitaDto.duracion_minutos || citaAnterior.duracion_minutos;
      const horaInicioDate = new Date(`2000-01-01T${horaInicio}`);
      const horaFinDate = new Date(horaInicioDate.getTime() + duracion * 60000);
      horaFinCalculada = horaFinDate.toTimeString().slice(0, 8);
      updateCitaDto.hora_fin = horaFinCalculada;
    }

    // Validar disponibilidad si cambia horario
    const cambiaHorario = 
      (updateCitaDto.doctor_id && updateCitaDto.doctor_id !== citaAnterior.doctor.id) ||
      (updateCitaDto.fecha && updateCitaDto.fecha !== citaAnterior.fecha) ||
      (updateCitaDto.hora_inicio && updateCitaDto.hora_inicio !== citaAnterior.hora_inicio) ||
      (updateCitaDto.duracion_minutos && updateCitaDto.duracion_minutos !== citaAnterior.duracion_minutos);
    
    if (cambiaHorario) {
      // Validar terapeuta principal
      await this.validarDisponibilidadTerapeuta(
        updateCitaDto.doctor_id || citaAnterior.doctor.id,
        updateCitaDto.fecha || citaAnterior.fecha,
        updateCitaDto.hora_inicio || citaAnterior.hora_inicio,
        horaFinCalculada,
        id
      );

      // Validar terapeutas adicionales si se están actualizando
      if (updateCitaDto.terapeutas_adicionales?.length > 0) {
        for (const terapeutaId of updateCitaDto.terapeutas_adicionales) {
          await this.validarDisponibilidadTerapeuta(
            terapeutaId,
            updateCitaDto.fecha || citaAnterior.fecha,
            updateCitaDto.hora_inicio || citaAnterior.hora_inicio,
            horaFinCalculada,
            id
          );
        }
      }
    }

    // Actualizar la cita
    const { paciente_id, doctor_id, servicio_id, motivo_id, estado_id, user_id, 
            terapeutas_adicionales, servicios_adicionales, ...datosActualizacion } = updateCitaDto;
    
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

    // Actualizar terapeutas adicionales si se proporcionaron
    if (terapeutas_adicionales !== undefined) {
      // Eliminar terapeutas adicionales actuales (excepto el principal)
      await this.citaTerapeutaRepository.delete({
        cita_id: id,
        rol_en_cita: 'apoyo'
      });

      // Agregar nuevos terapeutas adicionales
      if (terapeutas_adicionales.length > 0) {
        const nuevosTerapeutas = terapeutas_adicionales.map(terapeutaId => ({
          cita_id: id,
          terapeuta_id: terapeutaId,
          rol_en_cita: 'apoyo'
        }));
        await this.citaTerapeutaRepository.save(nuevosTerapeutas);
      }
    }

    // Actualizar servicios si se proporcionaron
    if (servicios_adicionales !== undefined || servicio_id !== undefined) {
      // Eliminar TODOS los servicios actuales
      await this.citaServicioRepository.delete({
        cita_id: id
      });

      // Determinar qué servicios guardar
      const serviciosParaGuardar = [];

      if (servicios_adicionales && servicios_adicionales.length > 0) {
        // Reunión clínica: guardar todos los servicios del array
        serviciosParaGuardar.push(...servicios_adicionales.map(servicioId => ({
          cita_id: id,
          servicio_id: servicioId
        })));
      } else if (servicio_id) {
        // Cita normal: guardar solo el servicio principal
        serviciosParaGuardar.push({
          cita_id: id,
          servicio_id: servicio_id
        });
      }

      if (serviciosParaGuardar.length > 0) {
        await this.citaServicioRepository.save(serviciosParaGuardar);
      }
    }

    // Actualizar terapeuta principal si cambió
    if (doctor_id) {
      await this.citaTerapeutaRepository.update(
        { cita_id: id, rol_en_cita: 'principal' },
        { terapeuta_id: doctor_id }
      );
    }

    // Obtener la cita actualizada
    const citaActualizada = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios']
    });

    // Generar descripción de cambios
    const cambios = this.generarDescripcionCambios(citaAnterior, citaActualizada, updateCitaDto);

    // Registrar en el historial
    await this.registrarHistorial(citaActualizada, 'UPDATE', userId, cambios);

    return this.formatearCitaRespuesta(citaActualizada);
  }

  /**
   * Eliminar cita
   */
  async remove(id: number, userId?: number): Promise<any> {
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'terapeutas', 'servicios']
    });

    if (!cita) {
      throw new BadRequestException(`Cita con ID ${id} no encontrada`);
    }

    const historialCount = await this.historialCitaRepository.count({
      where: { cita_id: id }
    });

    const citaInfo = {
      id: cita.id,
      paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
      doctor_nombre: `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim(),
      terapeutas_adicionales: cita.terapeutas
        ?.filter(t => t.rol_en_cita !== 'principal')
        .map(t => `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim()) || [],
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      servicio_nombre: cita.servicio.nombre,
      servicios: cita.servicios
        ?.map(s => s.servicio.nombre) || []
    };

    await this.citaRepository.delete(id);

    return {
      success: true,
      message: 'Cita eliminada exitosamente',
      cita_eliminada: citaInfo,
      registros_historial_eliminados: historialCount
    };
  }

  /**
   * Validar disponibilidad del terapeuta
   */
  private async validarDisponibilidadTerapeuta(
    doctorId: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    citaIdExcluir?: number
  ): Promise<void> {
    // Buscar todas las citas donde el terapeuta participe
    const citasTerapeutas = await this.citaTerapeutaRepository.find({
      where: { terapeuta_id: doctorId },
      relations: ['cita', 'cita.doctor', 'cita.paciente']
    });

    const citasExistentes = citasTerapeutas
      .map(ct => ct.cita)
      .filter(cita => 
        cita.fecha === fecha && 
        (!citaIdExcluir || cita.id !== citaIdExcluir)
      );

    for (const citaExistente of citasExistentes) {
      const conflicto = this.hayConflictoHorario(
        horaInicio,
        horaFin,
        citaExistente.hora_inicio,
        citaExistente.hora_fin
      );

      if (conflicto) {
        throw new ConflictException(
          `El terapeuta ya tiene una cita programada de ${citaExistente.hora_inicio} a ${citaExistente.hora_fin} ` +
          `con el paciente ${citaExistente.paciente.nombres} ${citaExistente.paciente.apellido_paterno}. ` +
          `Por favor, seleccione otro horario.`
        );
      }
    }
  }

  /**
   * Verificar conflicto de horarios
   */
  private hayConflictoHorario(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string
  ): boolean {
    const convertirAMinutos = (tiempo: string): number => {
      const [horas, minutos, segundos] = tiempo.split(':').map(Number);
      return horas * 60 + minutos + (segundos || 0) / 60;
    };

    const inicio1Min = convertirAMinutos(inicio1);
    const fin1Min = convertirAMinutos(fin1);
    const inicio2Min = convertirAMinutos(inicio2);
    const fin2Min = convertirAMinutos(fin2);

    return inicio1Min < fin2Min && fin1Min > inicio2Min;
  }

  /**
   * Formatear respuesta de cita
   */
  private formatearCitaRespuesta(cita: Cita): any {
    return {
      id: cita.id,
      paciente_id: cita.paciente.id,
      paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
      doctor_id: cita.doctor.id,
      doctor_nombre: `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim(),
      terapeutas_adicionales: cita.terapeutas
        ?.filter(t => t.rol_en_cita !== 'principal')
        .map(t => ({
          id: t.terapeuta_id,
          nombre: `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim(),
          rol: t.rol_en_cita
        })) || [],
      servicio_id: cita.servicio.id,
      servicio_nombre: cita.servicio.nombre,
      servicios: cita.servicios
        ?.map(s => ({
          servicio_id: s.servicio_id,
          nombre: s.servicio.nombre
        })) || [],
      motivo_id: cita.motivo.id,
      motivo_nombre: cita.motivo.nombre,
      estado_id: cita.estado.id,
      estado_nombre: cita.estado.nombre,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      nota: cita.nota,
      user_id_crea: cita.user_id_crea,
      user_id_actua: cita.user_id_actua,
      fecha_actua: cita.fecha_actua,
      created_at: cita.created_at,
      updated_at: cita.updated_at
    };
  }

  /**
   * Registrar historial
   */
private async registrarHistorial(
  cita: Cita,
  tipoOperacion: 'CREATE' | 'UPDATE' | 'DELETE',
  usuarioId?: number,
  descripcionCambios?: string
): Promise<void> {
  // 1. Crear el registro principal del historial
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

  const historialGuardado = await this.historialCitaRepository.save(historial);

  // 2. Guardar TODOS los terapeutas (principal + adicionales)
  if (cita.terapeutas && cita.terapeutas.length > 0) {
    const terapeutasHistorial = cita.terapeutas.map(t => ({
      historial_cita_id: historialGuardado.id,
      terapeuta_id: t.terapeuta_id,
      rol_en_cita: t.rol_en_cita
    }));
    await this.historialCitaTerapeutaRepository.save(terapeutasHistorial);
  }

  // 3. Guardar TODOS los servicios
  if (cita.servicios && cita.servicios.length > 0) {
    const serviciosHistorial = cita.servicios.map(s => ({
      historial_cita_id: historialGuardado.id,
      servicio_id: s.servicio_id
    }));
    await this.historialCitaServicioRepository.save(serviciosHistorial);
  }
}
  /**
   * Generar descripción de operación
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
   * Generar descripción de cambios
   */
  private generarDescripcionCambios(citaAnterior: Cita, citaActualizada: Cita, updateDto: UpdateCitaDto): string {
    const cambios: string[] = [];

    if (updateDto.paciente_id && citaAnterior.paciente.id !== citaActualizada.paciente.id) {
      cambios.push(`Paciente cambiado`);
    }

    if (updateDto.doctor_id && citaAnterior.doctor.id !== citaActualizada.doctor.id) {
      cambios.push(`Terapeuta principal cambiado`);
    }

    if (updateDto.terapeutas_adicionales !== undefined) {
      cambios.push(`Terapeutas adicionales actualizados`);
    }

    if (updateDto.servicio_id && citaAnterior.servicio.id !== citaActualizada.servicio.id) {
      cambios.push(`Servicio principal cambiado`);
    }

    if (updateDto.servicios_adicionales !== undefined) {
      cambios.push(`Servicios adicionales actualizados`);
    }

    if (updateDto.fecha && citaAnterior.fecha !== citaActualizada.fecha) {
      cambios.push(`Fecha cambiada de ${citaAnterior.fecha} a ${citaActualizada.fecha}`);
    }

    if (updateDto.hora_inicio && citaAnterior.hora_inicio !== citaActualizada.hora_inicio) {
      cambios.push(`Hora cambiada de ${citaAnterior.hora_inicio} a ${citaActualizada.hora_inicio}`);
    }

    if (updateDto.duracion_minutos && citaAnterior.duracion_minutos !== citaActualizada.duracion_minutos) {
      cambios.push(`Duración cambiada de ${citaAnterior.duracion_minutos} a ${citaActualizada.duracion_minutos} minutos`);
    }

    return cambios.length > 0 ? cambios.join('; ') : 'Actualización de cita';
  }

  /**
   * Obtener historial
   */
async obtenerHistorial(citaId: number): Promise<any[]> {
  const historial = await this.historialCitaRepository.find({
    where: { cita_id: citaId },
    relations: [
      'paciente', 
      'doctor', 
      'servicio', 
      'motivo', 
      'estado',
      'terapeutas',
      'terapeutas.terapeuta',
      'servicios',
      'servicios.servicio'
    ],
    order: { fecha_registro: 'DESC' }
  });

  return historial.map(h => {
    // Separar terapeuta principal y adicionales
    const terapeutaPrincipal = h.terapeutas.find(t => t.rol_en_cita === 'principal');
    const terapeutasAdicionales = h.terapeutas
      .filter(t => t.rol_en_cita !== 'principal')
      .map(t => ({
        id: t.terapeuta_id,
        nombre: `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim(),
        rol: t.rol_en_cita
      }));

    // Mapear servicios
    const servicios = h.servicios.map(s => ({
      id: s.servicio_id,
      nombre: s.servicio.nombre
    }));

    return {
      id: h.id,
      tipo_operacion: h.tipo_operacion,
      paciente_nombre: `${h.paciente.nombres} ${h.paciente.apellido_paterno} ${h.paciente.apellido_materno}`.trim(),
      doctor_nombre: terapeutaPrincipal 
        ? `${terapeutaPrincipal.terapeuta.nombres} ${terapeutaPrincipal.terapeuta.apellidos}`.trim()
        : `${h.doctor.nombres} ${h.doctor.apellidos}`.trim(),
      terapeutas_adicionales: terapeutasAdicionales,
      servicio_nombre: h.servicio.nombre,
      servicios: servicios,
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
    };
  });
}
}