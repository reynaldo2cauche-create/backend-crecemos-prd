import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { CreatePacienteServicioDto } from './dto/create-paciente-servicio.dto';
import { Paciente } from './paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { AsignarServicioTerapeutaDto } from './dto/asignar-servicio-terapeuta.dto';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Injectable()
export class PacienteServicioService {
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
      relations: ['paciente', 'servicio', 'asignaciones', 'asignaciones.terapeuta'],
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
    const pacienteServicio = await this.findOne(id);
    if (!pacienteServicio) {
      throw new Error('PacienteServicio no encontrado');
    }

    Object.assign(pacienteServicio, updatePacienteServicioDto);
    return this.pacienteServicioRepository.save(pacienteServicio);
  }

  async remove(id: number): Promise<void> {
    const pacienteServicio = await this.findOne(id);
    if (!pacienteServicio) {
      throw new Error('PacienteServicio no encontrado');
    }

    pacienteServicio.activo = false;
    await this.pacienteServicioRepository.save(pacienteServicio);
  }

  // Función auxiliar para verificar si un terapeuta está ocupado con el mismo paciente
  private async verificarTerapeutaOcupado(
    terapeutaId: number, 
    pacienteId: number, 
    servicioId?: number,
    pacienteServicioIdExcluir?: number
  ): Promise<{ ocupado: boolean; servicioExistente?: Servicios; terapeutaInfo?: TrabajadorCentro }> {
    // Buscar todas las asignaciones activas del terapeuta
    const asignacionesActivas = await this.asignacionTerapeutaRepository.find({
      where: {
        terapeuta: { id: terapeutaId },
        estado: 'ACTIVO',
        activo: true
      },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta']
    });

    // Filtrar asignaciones del mismo paciente (excluyendo la actual si se proporciona)
    const asignacionesMismoPaciente = asignacionesActivas.filter(asignacion => {
      const mismoPaciente = asignacion.pacienteServicio?.paciente?.id === pacienteId;
      const esMismoServicio = servicioId ? asignacion.pacienteServicio?.servicio?.id === servicioId : false;
      const esMismaAsignacion = pacienteServicioIdExcluir ? 
        asignacion.pacienteServicio?.id === pacienteServicioIdExcluir : false;
      
      return mismoPaciente && !esMismaAsignacion;
    });

    if (asignacionesMismoPaciente.length > 0) {
      const primeraAsignacion = asignacionesMismoPaciente[0];
      return {
        ocupado: true,
        servicioExistente: primeraAsignacion.pacienteServicio?.servicio,
        terapeutaInfo: primeraAsignacion.terapeuta
      };
    }

    return { ocupado: false };
  }

  async asignarServicioYTerapeuta(dto: AsignarServicioTerapeutaDto) {
    // ============================================
    // VALIDACIONES PRIMERO (ANTES DE CREAR NADA)
    // ============================================
    
    if (dto.terapeuta_id) {
      // Validar que el terapeuta no esté ocupado con el mismo paciente
      const verificacion = await this.verificarTerapeutaOcupado(
        dto.terapeuta_id, 
        dto.paciente_id,
        dto.servicio_id
      );

      if (verificacion.ocupado) {
        const terapeuta = verificacion.terapeutaInfo;
        const servicioExistente = verificacion.servicioExistente;
        
        if (servicioExistente?.id === dto.servicio_id) {
          // Es el mismo servicio
          throw new BadRequestException(
            `La terapeuta ${terapeuta.nombres} ${terapeuta.apellidos} ya está asignada al servicio "${servicioExistente.nombre}" para este paciente.`
          );
        } else {
          // Es un servicio DIFERENTE - NO permitido
          throw new BadRequestException(
            `La terapeuta ${terapeuta.nombres} ${terapeuta.apellidos} ya está asignada al servicio "${servicioExistente?.nombre || 'otro servicio'}" de este paciente. No se puede asignar a más de un servicio del mismo paciente.`
          );
        }
      }
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
    } else {
      const pacienteServicio = this.pacienteServicioRepository.create({
        paciente: { id: dto.paciente_id },
        servicio: { id: dto.servicio_id },
        fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(),
        estado: 'ACTIVO',
        activo: true
      });
      savedPacienteServicio = await this.pacienteServicioRepository.save(pacienteServicio);

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
        fecha_asignacion: dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(),
        estado: 'ACTIVO',
        activo: true
      });

      await this.asignacionTerapeutaRepository.save(asignacion);
      console.log('✅ Terapeuta asignado correctamente');
    }

    return {
      message: 'Servicio asignado correctamente' + (dto.terapeuta_id ? ' y terapeuta asignado' : ''),
      pacienteServicio: {
        id: savedPacienteServicio.id
      },
      paciente: savedPacienteServicio.paciente ? {
        id: savedPacienteServicio.paciente.id,
        nombres: savedPacienteServicio.paciente.nombres,
        apellidos: savedPacienteServicio.paciente.apellido_paterno + ' ' + savedPacienteServicio.paciente.apellido_materno
      } : null
    };
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

  async desasignarServicio(pacienteId: number, servicioId: number): Promise<{ message: string; paciente?: any }> {
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
      } : null
    };
  }

  async desasignarServicioPorId(pacienteServicioId: number): Promise<{ message: string; paciente?: any }> {
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
      } : null
    };
  }

  async crearAsignacionTerapeuta(dto: {
    paciente_servicio_id: number;
    terapeuta_id: number;
    fecha_asignacion: string;
    estado: string;
    user_id_crea: number;
  }) {
    console.log('📝 Creando primera asignación de terapeuta:', dto);

    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: dto.paciente_servicio_id },
      relations: ['paciente', 'servicio']
    });

    if (!pacienteServicio) {
      throw new Error(`PacienteServicio con ID ${dto.paciente_servicio_id} no encontrado`);
    }

    // ✅ VALIDACIÓN: Verificar si el terapeuta ya está asignado a otro servicio del mismo paciente
    const pacienteId = pacienteServicio.paciente.id;
    
    const verificacion = await this.verificarTerapeutaOcupado(
      dto.terapeuta_id, 
      pacienteId,
      pacienteServicio.servicio.id,
      dto.paciente_servicio_id
    );

    if (verificacion.ocupado) {
      const terapeuta = verificacion.terapeutaInfo;
      const servicioExistente = verificacion.servicioExistente;
      
      throw new BadRequestException(
        `La terapeuta ${terapeuta.nombres} ${terapeuta.apellidos} ya está asignada al servicio "${servicioExistente?.nombre || 'otro servicio'}" de este paciente. No se puede asignar a más de un servicio del mismo paciente.`
      );
    }

    const asignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: pacienteServicio,
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: new Date(dto.fecha_asignacion),
      estado: dto.estado || 'ACTIVO',
      activo: true
    });

    const asignacionGuardada = await this.asignacionTerapeutaRepository.save(asignacion);
    console.log('✅ Asignación creada con ID:', asignacionGuardada.id);

    return {
      message: 'Terapeuta asignado correctamente',
      asignacion: {
        id: asignacionGuardada.id
      },
      paciente: pacienteServicio.paciente ? {
        id: pacienteServicio.paciente.id,
        nombres: pacienteServicio.paciente.nombres,
        apellidos: pacienteServicio.paciente.apellido_paterno + ' ' + pacienteServicio.paciente.apellido_materno
      } : null
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

    // ✅ VALIDACIÓN: Verificar si el nuevo terapeuta ya está asignado a otro servicio del mismo paciente
    const pacienteId = asignacion.pacienteServicio.paciente.id;
    
    const verificacion = await this.verificarTerapeutaOcupado(
      dto.terapeuta_id, 
      pacienteId,
      asignacion.pacienteServicio.servicio.id,
      asignacion.pacienteServicio.id
    );

    if (verificacion.ocupado) {
      const terapeuta = verificacion.terapeutaInfo;
      const servicioExistente = verificacion.servicioExistente;
      
      throw new BadRequestException(
        `La terapeuta ${terapeuta.nombres} ${terapeuta.apellidos} ya está asignada al servicio "${servicioExistente?.nombre || 'otro servicio'}" de este paciente. No se puede asignar a más de un servicio del mismo paciente.`
      );
    }

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
      } : null
    };
  }

  async desasignarTerapeutaIndividual(asignacionId: number): Promise<{ message: string; paciente?: any }> {
    const asignacion = await this.asignacionTerapeutaRepository.findOne({
      where: { id: asignacionId, activo: true },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'terapeuta']
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
      } : null
    };
  }
}