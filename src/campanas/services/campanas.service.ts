import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Campana } from '../entities/campana.entity';
import { CampanaSeccion } from '../entities/campana-seccion.entity';
import { CreateCampanaDto } from '../dto/create-campana.dto';
import { UpdateCampanaDto } from '../dto/update-campana.dto';

@Injectable()
export class CampanasService {
  constructor(
    @InjectRepository(Campana)
    private readonly campanaRepo: Repository<Campana>,
    @InjectRepository(CampanaSeccion)
    private readonly seccionRepo: Repository<CampanaSeccion>,
  ) {}

  /**
   * Obtener todas las campañas (admin)
   */
  async findAll() {
    return this.campanaRepo.find({
      relations: ['estado', 'secciones'],
      order: { orden: 'ASC', created_at: 'DESC' },
    });
  }

  /**
   * Obtener campañas activas (público)
   */
  async findActivas() {
    const hoy = new Date().toISOString().split('T')[0];

    return this.campanaRepo.find({
      where: {
        estado_id: 1, // Estado "activa"
        fecha_inicio: LessThanOrEqual(hoy),
        fecha_fin: MoreThanOrEqual(hoy),
      },
      relations: ['secciones'],
      order: { orden: 'ASC', created_at: 'DESC' },
    });
  }

  /**
   * Obtener una campaña por ID
   */
  async findOne(id: number) {
    const campana = await this.campanaRepo.findOne({
      where: { id },
      relations: ['estado', 'secciones'],
    });

    if (!campana) {
      throw new NotFoundException(`Campaña con ID ${id} no encontrada`);
    }

    // Ordenar secciones por orden
    if (campana.secciones) {
      campana.secciones.sort((a, b) => a.orden - b.orden);
    }

    return campana;
  }

  /**
   * Crear una nueva campaña
   */
  async create(dto: CreateCampanaDto) {
    const campana = this.campanaRepo.create({
      titulo: dto.titulo,
      descripcion_corta: dto.descripcion_corta,
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: dto.fecha_fin,
      estado_id: dto.estado_id ?? 2, // Por defecto "inactiva"
      orden: dto.orden ?? 0,
      user_crea_id: dto.user_crea_id,
    });

    const campanaSaved = await this.campanaRepo.save(campana);

    // Crear secciones si las hay
    if (dto.secciones && dto.secciones.length > 0) {
      const secciones = dto.secciones.map((secDto, index) =>
        this.seccionRepo.create({
          campana_id: campanaSaved.id,
          titulo: secDto.titulo,
          contenido: secDto.contenido,
          orden: secDto.orden ?? index,
          user_crea_id: dto.user_crea_id,
        }),
      );
      await this.seccionRepo.save(secciones);
    }
    console.log(campana);
    return this.findOne(campanaSaved.id);
  }

  /**
   * Actualizar una campaña
   */
  async update(id: number, dto: UpdateCampanaDto) {
    const campana = await this.findOne(id);

    // Actualizar campos de la campaña
    if (dto.titulo !== undefined) campana.titulo = dto.titulo;
    if (dto.descripcion_corta !== undefined) campana.descripcion_corta = dto.descripcion_corta;
    if (dto.fecha_inicio !== undefined) campana.fecha_inicio = dto.fecha_inicio;
    if (dto.fecha_fin !== undefined) campana.fecha_fin = dto.fecha_fin;
    if (dto.estado_id !== undefined) campana.estado_id = dto.estado_id;
    if (dto.orden !== undefined) campana.orden = dto.orden;
    if (dto.user_actua_id !== undefined) campana.user_actua_id = dto.user_actua_id;

    await this.campanaRepo.save(campana);

    // Actualizar secciones si las hay
    if (dto.secciones !== undefined) {
      // Eliminar secciones antiguas
      await this.seccionRepo.delete({ campana_id: id });

      // Crear nuevas secciones
      if (dto.secciones.length > 0) {
        const secciones = dto.secciones.map((secDto, index) =>
          this.seccionRepo.create({
            campana_id: id,
            titulo: secDto.titulo,
            contenido: secDto.contenido,
            orden: secDto.orden ?? index,
            user_crea_id: dto.user_actua_id || campana.user_crea_id,
          }),
        );
        await this.seccionRepo.save(secciones);
      }
    }

    return this.findOne(id);
  }

  /**
   * Eliminar una campaña
   */
  async remove(id: number) {
    const campana = await this.findOne(id);
    await this.campanaRepo.remove(campana);
    return { message: `Campaña "${campana.titulo}" eliminada exitosamente` };
  }

  /**
   * Obtener estados de campaña
   */
  async getEstados() {
    return this.campanaRepo.query('SELECT * FROM campana_estado ORDER BY id');
  }
}
