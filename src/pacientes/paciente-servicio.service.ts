import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { CreatePacienteServicioDto } from './dto/create-paciente-servicio.dto';
import { Paciente } from './paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { AsignarServicioTerapeutaDto } from './dto/asignar-servicio-terapeuta.dto';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';

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

  async asignarServicioYTerapeuta(dto: AsignarServicioTerapeutaDto) {
    // 1. Verificar si ya existe un paciente_servicio activo para este paciente y servicio
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
      // Si existe, actualizar el existente
      savedPacienteServicio = existingPacienteServicio;
    } else {
      // Si no existe, crear uno nuevo
      const pacienteServicio = this.pacienteServicioRepository.create({
        paciente: { id: dto.paciente_id },
        servicio: { id: dto.servicio_id },
        fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(),
        estado: 'ACTIVO',
        activo: true
      });
      savedPacienteServicio = await this.pacienteServicioRepository.save(pacienteServicio);

      // Recargar con relaciones para obtener datos del paciente
      savedPacienteServicio = await this.pacienteServicioRepository.findOne({
        where: { id: savedPacienteServicio.id },
        relations: ['paciente', 'servicio']
      });
    }

    // 2. Solo crear asignacion_terapeuta si se envía terapeuta_id
    if (dto.terapeuta_id) {
      console.log('Asignando terapeuta:', dto.terapeuta_id, 'a paciente_servicio:', savedPacienteServicio.id);

      // Verificar si este terapeuta ya está asignado activamente a este paciente_servicio
      const asignacionExistente = await this.asignacionTerapeutaRepository.findOne({
        where: {
          pacienteServicio: { id: savedPacienteServicio.id },
          terapeuta: { id: dto.terapeuta_id },
          estado: 'ACTIVO',
          activo: true
        }
      });

      // Si el terapeuta ya está asignado, no crear duplicado
      if (asignacionExistente) {
        console.log('⚠️ El terapeuta ya está asignado a este servicio');
        return {
          message: 'El terapeuta ya está asignado a este servicio',
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

      // Crear nueva asignación activa SIN desactivar las anteriores
      const asignacion = this.asignacionTerapeutaRepository.create({
        pacienteServicio: savedPacienteServicio,
        terapeuta: { id: dto.terapeuta_id },
        fecha_asignacion: dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(),
        estado: 'ACTIVO',
        activo: true
      });

      const resultado = await this.asignacionTerapeutaRepository.save(asignacion);
      console.log('✅ Nueva asignación creada (múltiples terapeutas permitidos):', resultado);
    }

    // Retornar el pacienteServicio con su ID y datos del paciente para auditoría
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
      // Obtener TODAS las asignaciones activas (múltiples terapeutas)
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
    // 1. Buscar el paciente_servicio activo con relaciones del paciente
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

    // 2. Desactivar todas las asignaciones de terapeuta asociadas
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

    // 3. Desactivar el paciente_servicio
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
    // 1. Buscar el paciente_servicio por ID con relaciones del paciente
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: pacienteServicioId, activo: true },
      relations: ['asignaciones', 'servicio', 'paciente']
    });

    if (!pacienteServicio) {
      throw new Error(`PacienteServicio con ID ${pacienteServicioId} no encontrado`);
    }

    // 2. Desactivar todas las asignaciones de terapeuta asociadas
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

    // 3. Desactivar el paciente_servicio
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

    // 1. Buscar el paciente_servicio con sus relaciones
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: dto.paciente_servicio_id },
      relations: ['paciente', 'servicio']
    });

    if (!pacienteServicio) {
      throw new Error(`PacienteServicio con ID ${dto.paciente_servicio_id} no encontrado`);
    }

    // 2. Crear la asignación
    const asignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: pacienteServicio,
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: new Date(dto.fecha_asignacion),
      estado: dto.estado || 'ACTIVO',
      activo: true
    });

    const asignacionGuardada = await this.asignacionTerapeutaRepository.save(asignacion);
    console.log('✅ Asignación creada con ID:', asignacionGuardada.id);

    // 3. Retornar información del paciente para auditoría
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
    // 1. Buscar la asignación actual
    const asignacion = await this.asignacionTerapeutaRepository.findOne({
      where: { id: asignacionId },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta']
    });

    if (!asignacion) {
      throw new Error(`Asignación con ID ${asignacionId} no encontrada`);
    }

    // 2. Desactivar la asignación actual
    asignacion.estado = 'INACTIVO';
    asignacion.fecha_fin = new Date();
    asignacion.activo = false;
    await this.asignacionTerapeutaRepository.save(asignacion);

    // 3. Crear nueva asignación con el nuevo terapeuta
    const nuevaAsignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: asignacion.pacienteServicio,
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: new Date(),
      estado: 'ACTIVO',
      activo: true
    });

    await this.asignacionTerapeutaRepository.save(nuevaAsignacion);

    // 4. Retornar información del paciente para auditoría
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
    // 1. Buscar la asignación con relaciones
    const asignacion = await this.asignacionTerapeutaRepository.findOne({
      where: { id: asignacionId, activo: true },
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'terapeuta']
    });

    if (!asignacion) {
      throw new Error(`Asignación con ID ${asignacionId} no encontrada`);
    }

    // 2. Desactivar solo esta asignación específica
    asignacion.estado = 'INACTIVO';
    asignacion.fecha_fin = new Date();
    asignacion.activo = false;
    await this.asignacionTerapeutaRepository.save(asignacion);

    // 3. Retornar información
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