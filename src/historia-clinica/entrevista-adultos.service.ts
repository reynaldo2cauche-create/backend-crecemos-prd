import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntrevistaAdultos } from './entities/entrevista-adultos.entity';
import { CreateEntrevistaAdultosDto } from './dto/create-entrevista-adultos.dto';
import { UpdateEntrevistaAdultosDto } from './dto/update-entrevista-adultos.dto';

@Injectable()
export class EntrevistaAdultosService {
  constructor(
    @InjectRepository(EntrevistaAdultos)
    private entrevistaAdultosRepo: Repository<EntrevistaAdultos>,
  ) {}

  /**
   * Crear una nueva entrevista de adultos
   */
  async create(dto: CreateEntrevistaAdultosDto): Promise<EntrevistaAdultos> {
    console.log('📝 Creando entrevista de adultos para paciente:', dto.pacienteId);

    const entrevista = this.entrevistaAdultosRepo.create(dto);
    const saved = await this.entrevistaAdultosRepo.save(entrevista);

    console.log('✅ Entrevista de adultos creada con ID:', saved.id);
    return saved;
  }

  /**
   * Obtener todas las entrevistas de un paciente
   */
  async findByPaciente(pacienteId: number): Promise<EntrevistaAdultos[]> {
    console.log('🔍 Buscando entrevistas de adultos del paciente:', pacienteId);

    const entrevistas = await this.entrevistaAdultosRepo.find({
      where: { pacienteId, activo: true },
      relations: ['usuario', 'usuarioActua', 'remitidoPor'],
      order: { fecha: 'DESC' },
    });

    console.log(`✅ Encontradas ${entrevistas.length} entrevistas`);
    return entrevistas;
  }

  /**
   * Obtener una entrevista por ID
   */
  async findOne(id: number): Promise<EntrevistaAdultos> {
    console.log('🔍 Buscando entrevista de adultos ID:', id);

    const entrevista = await this.entrevistaAdultosRepo.findOne({
      where: { id, activo: true },
      relations: ['usuario', 'usuarioActua', 'paciente', 'remitidoPor'],
    });

    if (!entrevista) {
      throw new NotFoundException(`Entrevista de adultos con ID ${id} no encontrada`);
    }

    return entrevista;
  }

  /**
   * Actualizar una entrevista
   */
  async update(id: number, dto: UpdateEntrevistaAdultosDto): Promise<EntrevistaAdultos> {
    console.log('📝 Actualizando entrevista de adultos ID:', id);

    const entrevista = await this.findOne(id);

    Object.assign(entrevista, dto);
    const updated = await this.entrevistaAdultosRepo.save(entrevista);

    console.log('✅ Entrevista de adultos actualizada');
    return updated;
  }

  /**
   * Eliminar (soft delete) una entrevista
   */
  async remove(id: number): Promise<void> {
    console.log('🗑️ Eliminando entrevista de adultos ID:', id);

    const entrevista = await this.findOne(id);
    entrevista.activo = false;
    await this.entrevistaAdultosRepo.save(entrevista);

    console.log('✅ Entrevista de adultos eliminada (soft delete)');
  }

  /**
   * Obtener la última entrevista de un paciente
   */
  async findUltimaPorPaciente(pacienteId: number): Promise<EntrevistaAdultos | null> {
    console.log('🔍 Buscando última entrevista de adultos del paciente:', pacienteId);

    const entrevista = await this.entrevistaAdultosRepo.findOne({
      where: { pacienteId, activo: true },
      relations: ['usuario', 'usuarioActua', 'remitidoPor'],
      order: { fecha: 'DESC' },
    });

    return entrevista || null;
  }
}
