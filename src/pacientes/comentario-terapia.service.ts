import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComentarioTerapia } from './comentario-terapia.entity';
import { CreateComentarioTerapiaDto } from './dto/create-comentario-terapia.dto';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../evaluaciones/trabajador-centro.entity';

@Injectable()
export class ComentarioTerapiaService {
  constructor(
    @InjectRepository(ComentarioTerapia)
    private comentarioTerapiaRepository: Repository<ComentarioTerapia>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<TrabajadorCentro>,
  ) {}

  async create(createComentarioTerapiaDto: CreateComentarioTerapiaDto): Promise<ComentarioTerapia> {
    const pacienteServicio = await this.pacienteServicioRepository.findOne({
      where: { id: createComentarioTerapiaDto.paciente_servicio_id }
    });
    
    const terapeuta = await this.trabajadorCentroRepository.findOne({
      where: { id: createComentarioTerapiaDto.terapeuta_id }
    });

    if (!pacienteServicio || !terapeuta) {
      throw new Error('PacienteServicio o terapeuta no encontrado');
    }

    const comentarioTerapia = this.comentarioTerapiaRepository.create({
      pacienteServicio,
      terapeuta,
      comentario: createComentarioTerapiaDto.comentario,
      tipo: createComentarioTerapiaDto.tipo || 'GENERAL',
      activo: createComentarioTerapiaDto.activo ?? true,
    });

    return this.comentarioTerapiaRepository.save(comentarioTerapia);
  }

  async findAll(): Promise<ComentarioTerapia[]> {
    return this.comentarioTerapiaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { activo: true },
      order: { created_at: 'DESC' }
    });
  }

  async findByPacienteServicio(pacienteServicioId: number): Promise<ComentarioTerapia[]> {
    return this.comentarioTerapiaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        pacienteServicio: { id: pacienteServicioId },
        activo: true 
      },
      order: { created_at: 'DESC' }
    });
  }

  async findByTerapeuta(terapeutaId: number): Promise<ComentarioTerapia[]> {
    return this.comentarioTerapiaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        terapeuta: { id: terapeutaId },
        activo: true 
      },
      order: { created_at: 'DESC' }
    });
  }

  async findByPaciente(pacienteId: number): Promise<ComentarioTerapia[]> {
    return this.comentarioTerapiaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        pacienteServicio: { paciente: { id: pacienteId } },
        activo: true 
      },
      order: { created_at: 'DESC' }
    });
  }

  async findByTipo(tipo: string): Promise<ComentarioTerapia[]> {
    return this.comentarioTerapiaRepository.find({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { 
        tipo,
        activo: true 
      },
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: number): Promise<ComentarioTerapia> {
    return this.comentarioTerapiaRepository.findOne({
      relations: ['pacienteServicio', 'pacienteServicio.paciente', 'pacienteServicio.servicio', 'terapeuta'],
      where: { id, activo: true }
    });
  }

  async update(id: number, updateComentarioTerapiaDto: Partial<CreateComentarioTerapiaDto>): Promise<ComentarioTerapia> {
    const comentarioTerapia = await this.findOne(id);
    if (!comentarioTerapia) {
      throw new Error('ComentarioTerapia no encontrado');
    }

    Object.assign(comentarioTerapia, updateComentarioTerapiaDto);
    return this.comentarioTerapiaRepository.save(comentarioTerapia);
  }

  async remove(id: number): Promise<void> {
    const comentarioTerapia = await this.findOne(id);
    if (!comentarioTerapia) {
      throw new Error('ComentarioTerapia no encontrado');
    }

    comentarioTerapia.activo = false;
    await this.comentarioTerapiaRepository.save(comentarioTerapia);
  }
} 