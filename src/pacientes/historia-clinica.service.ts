import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoriaClinica } from './historia-clinica.entity';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../evaluaciones/trabajador-centro.entity';

@Injectable()
export class HistoriaClinicaService {
  constructor(
    @InjectRepository(HistoriaClinica)
    private historiaClinicaRepository: Repository<HistoriaClinica>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<TrabajadorCentro>,
  ) {}

  async create(createHistoriaClinicaDto: CreateHistoriaClinicaDto): Promise<HistoriaClinica> {
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: createHistoriaClinicaDto.paciente_servicio_id }
    });
    
    const terapeuta = await this.trabajadorCentroRepository.findOne({
      where: { id: createHistoriaClinicaDto.terapeuta_id }
    });

    if (!pacienteServicio || !terapeuta) {
      throw new Error('PacienteServicio o terapeuta no encontrado');
    }

    const historiaClinica = this.historiaClinicaRepository.create({
      pacienteServicio,
      terapeuta,
      fecha_sesion: new Date(createHistoriaClinicaDto.fecha_sesion),
      hora_inicio: createHistoriaClinicaDto.hora_inicio,
      hora_fin: createHistoriaClinicaDto.hora_fin,
      objetivo_sesion: createHistoriaClinicaDto.objetivo_sesion,
      actividades_realizadas: createHistoriaClinicaDto.actividades_realizadas,
      observaciones: createHistoriaClinicaDto.observaciones,
      tareas_casa: createHistoriaClinicaDto.tareas_casa,
      recomendaciones: createHistoriaClinicaDto.recomendaciones,
      activo: createHistoriaClinicaDto.activo ?? true,
    });

    return this.historiaClinicaRepository.save(historiaClinica);
  }

  async findAll(): Promise<HistoriaClinica[]> {
    return this.historiaClinicaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { activo: true },
      order: { fecha_sesion: 'DESC' }
    });
  }

  async findByPacienteServicio(pacienteServicioId: number): Promise<HistoriaClinica[]> {
    return this.historiaClinicaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        pacienteServicio: { id: pacienteServicioId },
        activo: true 
      },
      order: { fecha_sesion: 'DESC' }
    });
  }

  async findByTerapeuta(terapeutaId: number): Promise<HistoriaClinica[]> {
    return this.historiaClinicaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        terapeuta: { id: terapeutaId },
        activo: true 
      },
      order: { fecha_sesion: 'DESC' }
    });
  }

  async findByPaciente(pacienteId: number): Promise<HistoriaClinica[]> {
    return this.historiaClinicaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        pacienteServicio: { paciente: { id: pacienteId } },
        activo: true 
      },
      order: { fecha_sesion: 'DESC' }
    });
  }

  async findOne(id: number): Promise<HistoriaClinica> {
    return this.historiaClinicaRepository.findOne({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { id, activo: true }
    });
  }

  async update(id: number, updateHistoriaClinicaDto: Partial<CreateHistoriaClinicaDto>): Promise<HistoriaClinica> {
    const historiaClinica = await this.findOne(id);
    if (!historiaClinica) {
      throw new Error('HistoriaClinica no encontrado');
    }

    // Guardar datos anteriores para auditoría
    const datosAnteriores = { ...historiaClinica };

    Object.assign(historiaClinica, updateHistoriaClinicaDto);
    const resultado = await this.historiaClinicaRepository.save(historiaClinica);

    // Retornar datos anteriores y nuevos para auditoría detallada
    return {
      datosAnteriores,
      datosNuevos: resultado,
      ...resultado  // Spread para mantener compatibilidad con código existente
    } as any;
  }

  async remove(id: number): Promise<void> {
    const historiaClinica = await this.findOne(id);
    if (!historiaClinica) {
      throw new Error('HistoriaClinica no encontrado');
    }

    historiaClinica.activo = false;
    await this.historiaClinicaRepository.save(historiaClinica);
  }
} 