import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';
import { CreateAsignacionTerapeutaDto } from './dto/create-asignacion-terapeuta.dto';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { AsignarTerapeutaDto } from './dto/asignar-terapeuta.dto';

@Injectable()
export class AsignacionTerapeutaService {
  constructor(
    @InjectRepository(AsignacionTerapeuta)
    private asignacionTerapeutaRepository: Repository<AsignacionTerapeuta>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<TrabajadorCentro>,
  ) {}

  async create(createAsignacionTerapeutaDto: CreateAsignacionTerapeutaDto): Promise<AsignacionTerapeuta> {
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: createAsignacionTerapeutaDto.paciente_servicio_id }
    });
    
    const terapeuta = await this.trabajadorCentroRepository.findOne({
      where: { id: createAsignacionTerapeutaDto.terapeuta_id }
    });

    if (!pacienteServicio || !terapeuta) {
      throw new Error('PacienteServicio o terapeuta no encontrado');
    }

    // Verificar si ya existe una asignación activa para este paciente-servicio
    const asignacionExistente = await this.asignacionTerapeutaRepository.findOne({
      where: { 
        pacienteServicio: { id: createAsignacionTerapeutaDto.paciente_servicio_id },
        estado: 'ACTIVO',
        activo: true
      }
    });

    if (asignacionExistente) {
      // Desactivar la asignación anterior
      asignacionExistente.estado = 'INACTIVO';
      asignacionExistente.fecha_fin = new Date();
      await this.asignacionTerapeutaRepository.save(asignacionExistente);
    }

    const asignacionTerapeuta = this.asignacionTerapeutaRepository.create({
      pacienteServicio,
      terapeuta,
      fecha_asignacion: new Date(createAsignacionTerapeutaDto.fecha_asignacion),
      fecha_fin: createAsignacionTerapeutaDto.fecha_fin ? new Date(createAsignacionTerapeutaDto.fecha_fin) : null,
      observaciones: createAsignacionTerapeutaDto.observaciones,
      activo: createAsignacionTerapeutaDto.activo ?? true,
    });

    return this.asignacionTerapeutaRepository.save(asignacionTerapeuta);
  }

  async asignarTerapeuta(dto: AsignarTerapeutaDto) {
    console.log('AsignarTerapeuta - DTO recibido:', dto);
    
    // 1. Desactivar asignaciones anteriores del mismo paciente_servicio
    const asignacionesAnteriores = await this.asignacionTerapeutaRepository.find({
      where: {
        pacienteServicio: { id: dto.paciente_servicio_id },
        estado: 'ACTIVO',
        activo: true
      }
    });

    console.log('Asignaciones anteriores encontradas:', asignacionesAnteriores.length);

    if (asignacionesAnteriores.length > 0) {
      for (const asignacion of asignacionesAnteriores) {
        asignacion.estado = 'INACTIVO';
        asignacion.fecha_fin = new Date();
        asignacion.activo = false;
        await this.asignacionTerapeutaRepository.save(asignacion);
      }
    }

    // 2. Crear nueva asignación activa
    const asignacion = this.asignacionTerapeutaRepository.create({
      pacienteServicio: { id: dto.paciente_servicio_id },
      terapeuta: { id: dto.terapeuta_id },
      fecha_asignacion: new Date(),
      estado: 'ACTIVO',
      activo: true
    });
    
    const resultado = await this.asignacionTerapeutaRepository.save(asignacion);
    console.log('Nueva asignación creada:', resultado);
    return resultado;
  }

  async findAll(): Promise<AsignacionTerapeuta[]> {
    return this.asignacionTerapeutaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { activo: true }
    });
  }

  async findByTerapeuta(terapeutaId: number): Promise<AsignacionTerapeuta[]> {
    return this.asignacionTerapeutaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        terapeuta: { id: terapeutaId },
        estado: 'ACTIVO',
        activo: true 
      }
    });
  }

  async findByPacienteServicio(pacienteServicioId: number): Promise<AsignacionTerapeuta[]> {
    return this.asignacionTerapeutaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        pacienteServicio: { id: pacienteServicioId },
        activo: true 
      }
    });
  }

  async findOne(id: number): Promise<AsignacionTerapeuta> {
    return this.asignacionTerapeutaRepository.findOne({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { id, activo: true }
    });
  }

  async update(id: number, updateAsignacionTerapeutaDto: Partial<CreateAsignacionTerapeutaDto>): Promise<AsignacionTerapeuta> {
    const asignacionTerapeuta = await this.findOne(id);
    if (!asignacionTerapeuta) {
      throw new Error('AsignacionTerapeuta no encontrado');
    }

    Object.assign(asignacionTerapeuta, updateAsignacionTerapeutaDto);
    return this.asignacionTerapeutaRepository.save(asignacionTerapeuta);
  }

  async remove(id: number): Promise<void> {
    const asignacionTerapeuta = await this.findOne(id);
    if (!asignacionTerapeuta) {
      throw new Error('AsignacionTerapeuta no encontrado');
    }

    asignacionTerapeuta.estado = 'INACTIVO';
    asignacionTerapeuta.fecha_fin = new Date();
    asignacionTerapeuta.activo = false;
    await this.asignacionTerapeutaRepository.save(asignacionTerapeuta);
  }

  /**
   * Retorna los IDs de todos los subordinados directos de un jefe.
   * Si el trabajador no es jefe o no tiene subordinados, retorna [].
   */
  async getSubordinadosIds(jefeId: number): Promise<number[]> {
    const jefe = await this.trabajadorCentroRepository.findOne({
      where: { id: jefeId },
      relations: ['cargo', 'subordinados'],
    });

    if (!jefe?.cargo?.es_jefe || !jefe.subordinados?.length) {
      return [];
    }

    return jefe.subordinados.map((s) => s.id);
  }

  /**
   * Retorna la lista completa de subordinados de un jefe (id, nombres, apellidos).
   * Independientemente de si tienen asignaciones activas o no.
   */
  async getSubordinados(jefeId: number): Promise<{ id: number; nombres: string; apellidos: string }[]> {
    const jefe = await this.trabajadorCentroRepository.findOne({
      where: { id: jefeId },
      relations: ['cargo', 'subordinados'],
    });

    if (!jefe?.cargo?.es_jefe || !jefe.subordinados?.length) {
      return [];
    }

    return jefe.subordinados.map((s) => ({
      id: s.id,
      nombres: s.nombres,
      apellidos: s.apellidos,
    }));
  }

  /**
   * Obtiene asignaciones activas de múltiples terapeutas a la vez.
   * Usado por el jefe para ver su propia bandeja + la de sus subordinadas.
   */
  async findByTerapeutaIds(terapeutaIds: number[]): Promise<AsignacionTerapeuta[]> {
    if (!terapeutaIds.length) return [];
    return this.asignacionTerapeutaRepository.find({
      relations: [
        'pacienteServicio',
        'pacienteServicio.paciente',
        'pacienteServicio.servicio',
        'terapeuta',
      ],
      where: {
        terapeuta: { id: In(terapeutaIds) },
        estado: 'ACTIVO',
        activo: true,
      },
    });
  }
}