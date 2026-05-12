import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { CreatePacienteServicioDto } from './dto/create-paciente-servicio.dto';
import { Paciente } from './paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { AsignarServicioTerapeutaDto } from './dto/asignar-servicio-terapeuta.dto';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';

@Injectable()
export class PacienteServicioService {
  private readonly logger = new Logger(PacienteServicioService.name);

  constructor(
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    @InjectRepository(AsignacionTerapeuta)
    private asignacionTerapeutaRepository: Repository<AsignacionTerapeuta>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async create(createPacienteServicioDto: CreatePacienteServicioDto): Promise<PacienteServicio> {
    const paciente = await this.pacienteRepository.findOne({
      where: { id: createPacienteServicioDto.paciente_id }
    });
    
    const servicio = await this.serviciosRepository.findOne({
      where: { id: createPacienteServicioDto.servicio_id }
    });

    if (!paciente || !servicio) {
      throw new Error('Paciente o servicio no encontrado');
    }

    const pacienteServicio = this.pacienteServicioRepository.create({
      paciente,
      servicio,
      fecha_inicio: new Date(createPacienteServicioDto.fecha_inicio),
      fecha_fin: createPacienteServicioDto.fecha_fin ? new Date(createPacienteServicioDto.fecha_fin) : null,
      motivo_consulta: createPacienteServicioDto.motivo_consulta,
      observaciones: createPacienteServicioDto.observaciones,
      activo: createPacienteServicioDto.activo ?? true,
      estado_paciente_id: 1, // Nuevo por defecto
    });

    return this.pacienteServicioRepository.save(pacienteServicio);
  }

  async findAll(): Promise<PacienteServicio[]> {
    return this.pacienteServicioRepository.find({
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta'],
      where: { activo: true }
    });
  }

  async findByPaciente(pacienteId: number): Promise<PacienteServicio[]> {
    return this.pacienteServicioRepository.find({
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta', 'estadoPaciente'],
      where: {
        paciente: { id: pacienteId },
        activo: true
      }
    });
  }

  async findByServicio(servicioId: number): Promise<PacienteServicio[]> {
    return this.pacienteServicioRepository.find({
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta'],
      where: { 
        servicio: { id: servicioId },
        activo: true 
      }
    });
  }

  async findOne(id: number): Promise<PacienteServicio> {
    return this.pacienteServicioRepository.findOne({
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta'],
      where: { id, activo: true }
    });
  }

  async update(id: number, updatePacienteServicioDto: Partial<CreatePacienteServicioDto>): Promise<PacienteServicio> {
    const updateData: any = { ...updatePacienteServicioDto };
    const estadoCambiado = updatePacienteServicioDto.estado_paciente_id !== undefined;

    this.logger.log(`📝 update() PS id=${id} | estado_paciente_id=${updatePacienteServicioDto.estado_paciente_id} | estadoCambiado=${estadoCambiado}`);

    // Capturar estado anterior antes de modificar
    let estadoAnteriorNombre: string | null = null;
    if (estadoCambiado) {
      const anterior = await this.pacienteServicioRepository.findOne({
        where: { id },
        relations: ['estadoPaciente'],
      });
      estadoAnteriorNombre = anterior?.estadoPaciente?.nombre ?? 'Sin estado';

      // Map raw FK to relation so TypeORM doesn't reset it to null via save()
      updateData.estadoPaciente = updatePacienteServicioDto.estado_paciente_id
        ? { id: updatePacienteServicioDto.estado_paciente_id }
        : null;
      delete updateData.estado_paciente_id;
    }

    await this.pacienteServicioRepository.update(id, updateData);

    const result = await this.pacienteServicioRepository.findOne({
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta', 'estadoPaciente'],
      where: { id }
    });

    this.logger.log(`📝 update() result.paciente.id=${result?.paciente?.id} | estadoNuevo=${result?.estadoPaciente?.nombre}`);

    if (estadoCambiado && result?.paciente?.id) {
      await this.recalcularEstadoGlobal(result.paciente.id);
      await this.notificarCambioEstadoServicio(result, estadoAnteriorNombre);
    }

    return result;
  }

  private async notificarCambioEstadoServicio(
    ps: PacienteServicio,
    estadoAnterior: string | null,
  ): Promise<void> {
    try {
      const pacienteNombre = ps.paciente
        ? `${ps.paciente.nombres} ${ps.paciente.apellido_paterno ?? ''} ${ps.paciente.apellido_materno ?? ''}`.trim()
        : `Paciente #${ps.id}`;
      const servicioNombre = ps.servicio?.nombre ?? 'servicio';
      const estadoNuevo = ps.estadoPaciente?.nombre ?? 'Sin estado';

      this.logger.log(`🔔 Notificando cambio: PS id=${ps.id} | ${pacienteNombre} | ${servicioNombre} | "${estadoAnterior}" → "${estadoNuevo}"`);

      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'CAMBIO_ESTADO_SERVICIO',
        descripcion: `Estado del servicio ${servicioNombre} de ${pacienteNombre} cambió de "${estadoAnterior}" a "${estadoNuevo}"`,
        usuario_id: 1,
        datos_adicionales: {
          paciente_servicio_id: ps.id,
          paciente_id: ps.paciente?.id,
          paciente_nombre: pacienteNombre,
          servicio_id: ps.servicio?.id,
          servicio_nombre: servicioNombre,
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo,
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'CAMBIO_ESTADO_SERVICIO',
        titulo: 'Cambio de estado de servicio',
        mensaje: `${pacienteNombre} - ${servicioNombre}: "${estadoAnterior}" -> "${estadoNuevo}"`,
        evento_id: evento.id,
        roles_destino: [1],
      });

      this.logger.log(`✅ Notificación CAMBIO_ESTADO_SERVICIO creada correctamente`);
    } catch (error) {
      this.logger.error(`❌ Error al notificar cambio de estado de servicio: ${error?.message}`, error?.stack);
    }
  }

  private async recalcularEstadoGlobal(pacienteId: number): Promise<void> {
    const servicios = await this.pacienteServicioRepository.find({
      where: { paciente: { id: pacienteId }, activo: true },
      relations: ['estadoPaciente'],
    });
    if (servicios.length === 0) return;

    const estadoIds = servicios
      .map(ps => ps.estadoPaciente?.id ?? null)
      .filter((id): id is number => id !== null);
    if (estadoIds.length === 0) return;

    const PRIORIDAD = [4, 3, 2, 1];
    const todosInactivos = estadoIds.every(id => id === 5);
    let nuevoEstadoId: number;

    if (todosInactivos) {
      nuevoEstadoId = 5;
    } else {
      const activos = estadoIds.filter(id => id !== 5);
      nuevoEstadoId = PRIORIDAD.find(p => activos.includes(p)) ?? 1;
    }

    await this.pacienteRepository.update(pacienteId, { estado: { id: nuevoEstadoId } as any });
  }

  async remove(id: number): Promise<void> {
    const pacienteServicio = await this.findOne(id);
    if (!pacienteServicio) {
      throw new Error('PacienteServicio no encontrado');
    }

    pacienteServicio.activo = false;
    await this.pacienteServicioRepository.save(pacienteServicio);
  }

  // ✅ FUNCIÓN CORREGIDA - EVITA QUE UN TERAPEUTA TENGA MÚLTIPLES SERVICIOS CON EL MISMO PACIENTE
 private async verificarTerapeutaOcupado(
    terapeutaId: number, 
    pacienteId: number, 
    servicioId: number,
    pacienteServicioIdExcluir?: number
  ): Promise<{ ocupado: boolean; servicioExistente?: Servicios; terapeutaInfo?: TrabajadorCentro; mensaje?: string }> {
    
    console.log(`🔍 Verificando terapeuta ${terapeutaId} para paciente ${pacienteId}, servicio ${servicioId}, excluir: ${pacienteServicioIdExcluir}`);
    
    // Buscar TODAS las asignaciones activas del terapeuta para ESTE PACIENTE
    const asignacionesActivas = await this.asignacionTerapeutaRepository.find({
      where: {
        terapeuta: { id: terapeutaId },
        estado: 'ACTIVO',
        activo: true
      },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta']
    });

    console.log(`📊 Total asignaciones activas del terapeuta: ${asignacionesActivas.length}`);

    // Filtrar solo las asignaciones del paciente específico
    const asignacionesDelPaciente = asignacionesActivas.filter(asignacion => {
      const esDelPaciente = asignacion.pacienteServicio?.paciente?.id === pacienteId;
      if (esDelPaciente) {
        console.log(`   - Asignación ID: ${asignacion.id}, Servicio: "${asignacion.pacienteServicio?.servicio?.nombre}" (ID: ${asignacion.pacienteServicio?.servicio?.id})`);
      }
      return esDelPaciente;
    });

    console.log(`📋 Asignaciones del paciente específico: ${asignacionesDelPaciente.length}`);

    // Si no hay asignaciones para este paciente, el terapeuta está libre
    if (asignacionesDelPaciente.length === 0) {
      console.log('✅ Terapeuta libre para este paciente');
      return { ocupado: false };
    }

    // Si estamos excluyendo una asignación específica (en caso de actualización)
    const asignacionesAValidar = asignacionesDelPaciente.filter(asignacion => 
      pacienteServicioIdExcluir ? asignacion.pacienteServicio?.id !== pacienteServicioIdExcluir : true
    );

    console.log(`📝 Asignaciones a validar (después de excluir): ${asignacionesAValidar.length}`);

    // Si después de excluir no quedan asignaciones, está libre
    if (asignacionesAValidar.length === 0) {
      console.log('✅ Terapeuta libre (todas las asignaciones fueron excluidas)');
      return { ocupado: false };
    }

    // ✅ CORRECCIÓN: VERIFICAR TODAS LAS ASIGNACIONES, NO SOLO LA PRIMERA
    
    // 1. Primero verificar si ya está asignado al MISMO servicio (duplicado)
    const asignacionMismoServicio = asignacionesAValidar.find(asignacion => 
      asignacion.pacienteServicio?.servicio?.id === servicioId
    );

    if (asignacionMismoServicio) {
      console.log(`❌ Terapeuta ya asignado al MISMO servicio: ${asignacionMismoServicio.pacienteServicio?.servicio?.nombre}`);
      return {
        ocupado: true,
        servicioExistente: asignacionMismoServicio.pacienteServicio?.servicio,
        terapeutaInfo: asignacionMismoServicio.terapeuta,
        mensaje: `La terapeuta ${asignacionMismoServicio.terapeuta.nombres} ${asignacionMismoServicio.terapeuta.apellidos} ya está asignada a este servicio del paciente.`
      };
    }

    // 2. Si no está en el mismo servicio, verificar si está en OTRO servicio del mismo paciente
    const asignacionOtroServicio = asignacionesAValidar[0]; // Cualquiera sirve, ya que todos son servicios diferentes
    
    if (asignacionOtroServicio) {
      console.log(`❌ Terapeuta ya asignado a OTRO servicio: ${asignacionOtroServicio.pacienteServicio?.servicio?.nombre}`);
      return {
        ocupado: true,
        servicioExistente: asignacionOtroServicio.pacienteServicio?.servicio,
        terapeutaInfo: asignacionOtroServicio.terapeuta,
        mensaje: `La terapeuta ${asignacionOtroServicio.terapeuta.nombres} ${asignacionOtroServicio.terapeuta.apellidos} ya está asignada al servicio "${asignacionOtroServicio.pacienteServicio?.servicio?.nombre}" del paciente. Un terapeuta no puede brindar múltiples servicios al mismo paciente.`
      };
    }

    // Este caso no debería ocurrir, pero por seguridad
    console.log('⚠️ Caso no manejado, retornando libre');
    return { ocupado: false };
  }
 async asignarServicioYTerapeuta(dto: AsignarServicioTerapeutaDto) {
    console.log('📥 DTO recibido:', dto);
    console.log('📥 fecha_inicio recibida:', dto.fecha_inicio, 'Tipo:', typeof dto.fecha_inicio);

    // ============================================
    // VALIDACIONES PRIMERO (ANTES DE CREAR NADA)
    // ============================================
    
    if (dto.terapeuta_id) {
      const verificacion = await this.verificarTerapeutaOcupado(
        dto.terapeuta_id, 
        dto.paciente_id,
        dto.servicio_id,
        null
      );

      if (verificacion.ocupado) {
        const terapeuta = verificacion.terapeutaInfo;
        throw new BadRequestException(
          `La terapeuta ${terapeuta.nombres} ${terapeuta.apellidos} ya está asignada a este servicio del paciente.`
        );
      }
    }

    // ============================================
    // VALIDAR Y FORMATEAR LA FECHA
    // ============================================
    let fechaInicio: Date;
    
    try {
      if (dto.fecha_inicio) {
        // Intentar parsear la fecha
        const fechaStr = dto.fecha_inicio;
        
        // Si es solo fecha (YYYY-MM-DD), agregar hora peruana
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
          // Fecha peruana a medianoche
          fechaInicio = new Date(`${fechaStr}T00:00:00-05:00`);
          console.log('📅 Fecha formateada (solo fecha):', fechaInicio.toISOString());
        } 
        // Si ya es ISO 8601
        else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fechaStr)) {
          fechaInicio = new Date(fechaStr);
          console.log('📅 Fecha formateada (ISO):', fechaInicio.toISOString());
        }
        // Si no es ninguno, usar fecha actual Perú
        else {
          console.warn('⚠️ Formato de fecha no reconocido, usando fecha actual Perú');
          fechaInicio = this.getCurrentPeruTime();
        }
      } else {
        // Si no viene fecha, usar fecha actual Perú
        fechaInicio = this.getCurrentPeruTime();
      }
      
      // Validar que la fecha sea válida
      if (isNaN(fechaInicio.getTime())) {
        throw new Error('Fecha inválida');
      }
      
      console.log('✅ Fecha procesada:', fechaInicio.toISOString());
      
    } catch (error) {
      console.error('❌ Error procesando fecha:', error);
      fechaInicio = this.getCurrentPeruTime();
    }

    // ============================================
    // CREAR O ACTUALIZAR PACIENTE_SERVICIO
    // ============================================
    
    const existingPacienteServicio = await this.pacienteServicioRepository.findOne({
      where: {
        paciente: { id: dto.paciente_id },
        servicio: { id: dto.servicio_id },
        activo: true
      },
      relations: ['paciente', 'servicio']
    });

    let savedPacienteServicio: PacienteServicio;

    if (existingPacienteServicio) {
      savedPacienteServicio = existingPacienteServicio;
      console.log('📋 Servicio ya existente, usando:', savedPacienteServicio.id);
    } else {
      const pacienteServicio = this.pacienteServicioRepository.create({
        paciente: { id: dto.paciente_id },
        servicio: { id: dto.servicio_id },
        fecha_inicio: fechaInicio,
        estado: 'ACTIVO',
        activo: true,
        motivo_consulta: dto.motivo_consulta || '',
        observaciones: dto.observaciones || '',
        estado_paciente_id: 1, // Nuevo por defecto
      });
      
      savedPacienteServicio = await this.pacienteServicioRepository.save(pacienteServicio);
      console.log('✅ Nuevo servicio creado:', savedPacienteServicio.id);

      savedPacienteServicio = await this.pacienteServicioRepository.findOne({
        where: { id: savedPacienteServicio.id },
        relations: ['paciente', 'servicio']
      });
    }

    // ============================================
    // CREAR ASIGNACIÓN DE TERAPEUTA
    // ============================================
    
    if (dto.terapeuta_id) {
      const asignacion = this.asignacionTerapeutaRepository.create({
        pacienteServicio: savedPacienteServicio,
        terapeuta: { id: dto.terapeuta_id },
        fecha_asignacion: fechaInicio, // Usar la misma fecha
        estado: 'ACTIVO',
        activo: true
      });

      const asignacionGuardada = await this.asignacionTerapeutaRepository.save(asignacion);
      console.log('✅ Terapeuta asignado correctamente');

      // 🔥 Cargar terapeuta para auditoría
      const asignacionConTerapeuta = await this.asignacionTerapeutaRepository.findOne({
        where: { id: asignacionGuardada.id },
        relations: ['terapeuta']
      });

      return {
        message: 'Servicio asignado correctamente y terapeuta asignado',
        pacienteServicio: {
          id: savedPacienteServicio.id
        },
        paciente: savedPacienteServicio.paciente ? {
          id: savedPacienteServicio.paciente.id,
          nombres: savedPacienteServicio.paciente.nombres,
          apellidos: savedPacienteServicio.paciente.apellido_paterno + ' ' + savedPacienteServicio.paciente.apellido_materno
        } : null,
        servicio: savedPacienteServicio.servicio,
        terapeuta: asignacionConTerapeuta?.terapeuta
      };
    }

    return {
      message: 'Servicio asignado correctamente',
      pacienteServicio: {
        id: savedPacienteServicio.id
      },
      paciente: savedPacienteServicio.paciente ? {
        id: savedPacienteServicio.paciente.id,
        nombres: savedPacienteServicio.paciente.nombres,
        apellidos: savedPacienteServicio.paciente.apellido_paterno + ' ' + savedPacienteServicio.paciente.apellido_materno
      } : null,
      servicio: savedPacienteServicio.servicio
    };
  }

  // ============================================
  // MÉTODO AUXILIAR PARA OBTENER HORA PERÚ
  // ============================================
  private getCurrentPeruTime(): Date {
    const now = new Date();
    // Perú está en UTC-5
    const offsetPeru = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
    return new Date(now.getTime() + offsetPeru);
  }

  async getServiciosConTerapeutaActual(pacienteId: number) {
    const servicios = await this.pacienteServicioRepository.find({
      where: { paciente: { id: pacienteId }, activo: true },
      relations: [
        'servicio',
        'asignaciones',
        'asignaciones.terapeuta'
      ],
      order: {
        created_at: 'DESC'
      }
    });

    return servicios.map(ps => {
      const asignacionesActivas = ps.asignaciones?.filter(a =>
        a.estado === 'ACTIVO' && a.activo
      ) || [];

      return {
        id: ps.id,
        servicio: ps.servicio,
        asignaciones: asignacionesActivas,
        fecha_inicio: ps.fecha_inicio,
        estado: ps.estado,
        motivo_consulta: ps.motivo_consulta
      };
    });
  }

  async desasignarServicio(pacienteId: number, servicioId: number): Promise<{ message: string; paciente?: any; servicio?: any }> {
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: {
        paciente: { id: pacienteId },
        servicio: { id: servicioId },
        activo: true
      },
      relations: ['asignaciones', 'paciente', 'servicio']
    });

    if (!pacienteServicio) {
      throw new Error(`No se encontró un servicio activo con ID ${servicioId} para el paciente ${pacienteId}`);
    }

    if (pacienteServicio.asignaciones && pacienteServicio.asignaciones.length > 0) {
      for (const asignacion of pacienteServicio.asignaciones) {
        if (asignacion.activo) {
          asignacion.estado = 'INACTIVO';
          asignacion.fecha_fin = new Date();
          asignacion.activo = false;
          await this.asignacionTerapeutaRepository.save(asignacion);
        }
      }
    }

    pacienteServicio.activo = false;
    pacienteServicio.fecha_fin = new Date();
    pacienteServicio.estado = 'INACTIVO';
    await this.pacienteServicioRepository.save(pacienteServicio);

    return {
      message: `Servicio "${pacienteServicio.servicio?.nombre}" desasignado correctamente del paciente`,
      paciente: pacienteServicio.paciente ? {
        id: pacienteServicio.paciente.id,
        nombres: pacienteServicio.paciente.nombres,
        apellidos: pacienteServicio.paciente.apellido_paterno + ' ' + pacienteServicio.paciente.apellido_materno
      } : null,
      servicio: pacienteServicio.servicio
    };
  }

  async desasignarServicioPorId(pacienteServicioId: number): Promise<{ message: string; paciente?: any; servicio?: any }> {
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: pacienteServicioId, activo: true },
      relations: ['asignaciones', 'servicio', 'paciente']
    });

    if (!pacienteServicio) {
      throw new Error(`PacienteServicio con ID ${pacienteServicioId} no encontrado`);
    }

    if (pacienteServicio.asignaciones && pacienteServicio.asignaciones.length > 0) {
      for (const asignacion of pacienteServicio.asignaciones) {
        if (asignacion.activo) {
          asignacion.estado = 'INACTIVO';
          asignacion.fecha_fin = new Date();
          asignacion.activo = false;
          await this.asignacionTerapeutaRepository.save(asignacion);
        }
      }
    }

    pacienteServicio.activo = false;
    pacienteServicio.fecha_fin = new Date();
    pacienteServicio.estado = 'INACTIVO';
    await this.pacienteServicioRepository.save(pacienteServicio);

    return {
      message: `Servicio "${pacienteServicio.servicio?.nombre}" desasignado correctamente del paciente`,
      paciente: pacienteServicio.paciente ? {
        id: pacienteServicio.paciente.id,
        nombres: pacienteServicio.paciente.nombres,
        apellidos: pacienteServicio.paciente.apellido_paterno + ' ' + pacienteServicio.paciente.apellido_materno
      } : null,
      servicio: pacienteServicio.servicio
    };
  }

 
  async crearAsignacionTerapeuta(dto: {
    paciente_servicio_id: number;
    terapeuta_id: number;
    fecha_asignacion: string;
    estado: string;
    user_id_crea: number;
  }) {
    console.log('📝 Creando asignación de terapeuta:', dto);

    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: dto.paciente_servicio_id },
      relations: ['paciente', 'servicio']
    });

    if (!pacienteServicio) {
      throw new Error(`PacienteServicio con ID ${dto.paciente_servicio_id} no encontrado`);
    }

    // ✅ VALIDACIÓN: Verificar si el terapeuta ya está en OTRO servicio del mismo paciente
    const verificacion = await this.verificarTerapeutaOcupado(
      dto.terapeuta_id, 
      pacienteServicio.paciente.id,
      pacienteServicio.servicio.id,
      dto.paciente_servicio_id // Excluir asignaciones de este servicio específico
    );

    if (verificacion.ocupado) {
      throw new BadRequestException(
        verificacion.mensaje || `La terapeuta ya está asignada a otro servicio del paciente.`
      );
    }

    // Verificar si ya existe una asignación activa para este terapeuta en este servicio
    const asignacionExistente = await this.asignacionTerapeutaRepository.findOne({
      where: {
        pacienteServicio: { id: dto.paciente_servicio_id },
        terapeuta: { id: dto.terapeuta_id },
        estado: 'ACTIVO',
        activo: true
      }
    });

    if (asignacionExistente) {
      throw new BadRequestException(
        'Este terapeuta ya está asignado a este servicio.'
      );
    }

    // ✅ PROCESAR FECHA
    let fechaAsignacion: Date;
    try {
      fechaAsignacion = this.parsearFechaISO(dto.fecha_asignacion);
    } catch (error) {
      fechaAsignacion = new Date();
    }

    const asignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: pacienteServicio,
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: fechaAsignacion,
      estado: dto.estado || 'ACTIVO',
      activo: true
    });

    const asignacionGuardada = await this.asignacionTerapeutaRepository.save(asignacion);
    console.log('✅ Asignación creada con ID:', asignacionGuardada.id);

    // 🔥 Cargar terapeuta para auditoría
    const terapeuta = await this.trabajadorRepository.findOne({
      where: { id: dto.terapeuta_id }
    });

    return {
      message: 'Terapeuta asignado correctamente',
      asignacion: {
        id: asignacionGuardada.id
      },
      paciente: pacienteServicio.paciente ? {
        id: pacienteServicio.paciente.id,
        nombres: pacienteServicio.paciente.nombres,
        apellidos: pacienteServicio.paciente.apellido_paterno + ' ' + pacienteServicio.paciente.apellido_materno
      } : null,
      servicio: pacienteServicio.servicio,
      terapeuta: terapeuta
    };
  }

   async actualizarAsignacionTerapeuta(asignacionId: number, dto: { terapeuta_id: number; user_id_actua: number }) {
    const asignacion = await this.asignacionTerapeutaRepository.findOne({
      where: { id: asignacionId },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta']
    });

    if (!asignacion) {
      throw new Error(`Asignación con ID ${asignacionId} no encontrada`);
    }

    // 🔥 Guardar terapeuta anterior para auditoría
    const terapeutaAnterior = asignacion.terapeuta;

    // ✅ VALIDACIÓN: Verificar si el NUEVO terapeuta ya está en OTRO servicio del mismo paciente
    const verificacion = await this.verificarTerapeutaOcupado(
      dto.terapeuta_id,
      asignacion.pacienteServicio.paciente.id,
      asignacion.pacienteServicio.servicio.id,
      asignacion.pacienteServicio.id // Excluir asignaciones de este servicio
    );

    if (verificacion.ocupado) {
      throw new BadRequestException(
        verificacion.mensaje || `La terapeuta ya está asignada a otro servicio del paciente.`
      );
    }

    // Cargar nuevo terapeuta
    const nuevoTerapeuta = await this.trabajadorRepository.findOne({
      where: { id: dto.terapeuta_id }
    });

    // Inactivar la asignación actual
    asignacion.estado = 'INACTIVO';
    asignacion.fecha_fin = new Date();
    asignacion.activo = false;
    await this.asignacionTerapeutaRepository.save(asignacion);

    // Crear nueva asignación
    const nuevaAsignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: asignacion.pacienteServicio,
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: new Date(),
      estado: 'ACTIVO',
      activo: true
    });

    await this.asignacionTerapeutaRepository.save(nuevaAsignacion);

    return {
      message: 'Terapeuta actualizado correctamente',
      paciente: asignacion.pacienteServicio?.paciente ? {
        id: asignacion.pacienteServicio.paciente.id,
        nombres: asignacion.pacienteServicio.paciente.nombres,
        apellidos: asignacion.pacienteServicio.paciente.apellido_paterno + ' ' + asignacion.pacienteServicio.paciente.apellido_materno
      } : null,
      servicio: asignacion.pacienteServicio?.servicio,
      terapeutaAnterior: terapeutaAnterior,
      terapeutaNuevo: nuevoTerapeuta
    };
  }

  async desasignarTerapeutaIndividual(asignacionId: number): Promise<{ message: string; paciente?: any; servicio?: any; terapeuta?: any }> {
    const asignacion = await this.asignacionTerapeutaRepository.findOne({
      where: { id: asignacionId, activo: true },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta']
    });

    if (!asignacion) {
      throw new Error(`Asignación con ID ${asignacionId} no encontrada`);
    }

    asignacion.estado = 'INACTIVO';
    asignacion.fecha_fin = new Date();
    asignacion.activo = false;
    await this.asignacionTerapeutaRepository.save(asignacion);

    return {
      message: `Terapeuta ${asignacion.terapeuta.nombres} ${asignacion.terapeuta.apellidos} desasignado correctamente`,
      paciente: asignacion.pacienteServicio?.paciente ? {
        id: asignacion.pacienteServicio.paciente.id,
        nombres: asignacion.pacienteServicio.paciente.nombres,
        apellidos: asignacion.pacienteServicio.paciente.apellido_paterno + ' ' + asignacion.pacienteServicio.paciente.apellido_materno
      } : null,
      servicio: asignacion.pacienteServicio?.servicio,
      terapeuta: asignacion.terapeuta
    };
  }
  private parsearFechaISO(fechaString: any): Date {
    try {
      if (!fechaString) return new Date();
      
      if (fechaString instanceof Date) return fechaString;
      
      if (typeof fechaString === 'string') {
        const isoPatterns = [
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
          /^\d{4}-\d{2}-\d{2}$/,
        ];
        
        const esISOValido = isoPatterns.some(pattern => pattern.test(fechaString));
        
        if (!esISOValido) {
          throw new BadRequestException(
            `Formato de fecha inválido: "${fechaString}". Debe ser ISO 8601 (ej: "2024-01-15T10:30:00.000-05:00" o "2024-01-15")`
          );
        }
        
        const fecha = new Date(fechaString);
        
        if (isNaN(fecha.getTime())) {
          throw new BadRequestException(`Fecha inválida: "${fechaString}"`);
        }
        
        return fecha;
      }
      
      throw new BadRequestException('Fecha debe ser string o Date');
      
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al parsear fecha: ${error.message}`);
    }
  }
}