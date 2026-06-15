import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Campana } from '../entities/campana.entity';
import { CampanaSeccion } from '../entities/campana-seccion.entity';
import { CreateCampanaDto } from '../dto/create-campana.dto';
import { UpdateCampanaDto } from '../dto/update-campana.dto';

// Normaliza un datetime que llega del frontend ('YYYY-MM-DDTHH:mm' o con segundos)
// al formato que MySQL acepta sin ambigüedad: 'YYYY-MM-DD HH:mm:ss' (sin conversión de zona).
const normalizarDatetime = (v?: string): string => {
  if (!v) return v;
  let s = v.replace('T', ' ').trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) s += ':00'; // agrega segundos si faltan
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += ' 00:00:00';       // solo fecha → medianoche
  return s;
};

@Injectable()
export class CampanasService {
  constructor(
    @InjectRepository(Campana)
    private readonly campanaRepo: Repository<Campana>,
    @InjectRepository(CampanaSeccion)
    private readonly seccionRepo: Repository<CampanaSeccion>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
   * Devuelve TODAS las campañas con estado "activa", sin filtrar por fechas vigentes
   * El filtro por año se hace en el frontend
   */
  async findActivas() {
    // Se publica sola cuando llega su fecha+hora de inicio (la columna es datetime).
    // NO se filtra por fecha_fin a propósito: una campaña sigue mostrándose aunque haya
    // terminado; el filtro por año (en el frontend) la agrupa por año.
    return this.campanaRepo
      .createQueryBuilder('campana')
      .leftJoinAndSelect('campana.secciones', 'secciones')
      .where('campana.estado_id = :estado', { estado: 1 })
      .andWhere('campana.fecha_inicio <= NOW()')
      .orderBy('campana.fecha_inicio', 'DESC')
      .addOrderBy('campana.orden', 'ASC')
      .getMany();
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
    const campanaSaved = await this.dataSource.transaction(async (manager) => {
      const campana = manager.create(Campana, {
        titulo: dto.titulo,
        descripcion_corta: dto.descripcion_corta,
        fecha_inicio: normalizarDatetime(dto.fecha_inicio),
        fecha_fin: normalizarDatetime(dto.fecha_fin),
        estado_id: dto.estado_id ?? 2,
        orden: dto.orden ?? 0,
        user_crea_id: dto.user_crea_id,
      });

      const saved = await manager.save(campana);

      if (dto.secciones && dto.secciones.length > 0) {
        const secciones = dto.secciones.map((secDto, index) =>
          manager.create(CampanaSeccion, {
            campana_id: saved.id,
            titulo: secDto.titulo,
            contenido: secDto.contenido,
            orden: secDto.orden ?? index,
            user_crea_id: dto.user_crea_id,
          }),
        );
        await manager.save(CampanaSeccion, secciones);
      }

      return saved;
    });

    return this.findOne(campanaSaved.id);
  }

  /**
   * Actualizar una campaña
   */
  async update(id: number, dto: UpdateCampanaDto) {
    await this.dataSource.transaction(async (manager) => {
      const campana = await this.findOne(id); // valida que exista

      // Actualizar SOLO columnas escalares con un UPDATE directo. Si se guardara la
      // entidad cargada (con la relación `estado`/`usuarioActualiza`), TypeORM daría
      // prioridad al objeto de relación y sobreescribiría el estado_id que cambiamos.
      const cambios: Partial<Campana> = {};
      if (dto.titulo !== undefined) cambios.titulo = dto.titulo;
      if (dto.descripcion_corta !== undefined) cambios.descripcion_corta = dto.descripcion_corta;
      if (dto.fecha_inicio !== undefined) cambios.fecha_inicio = normalizarDatetime(dto.fecha_inicio);
      if (dto.fecha_fin !== undefined) cambios.fecha_fin = normalizarDatetime(dto.fecha_fin);
      if (dto.estado_id !== undefined) cambios.estado_id = dto.estado_id;
      if (dto.orden !== undefined) cambios.orden = dto.orden;
      if (dto.user_actua_id !== undefined) cambios.user_actua_id = dto.user_actua_id;

      if (Object.keys(cambios).length > 0) {
        await manager.update(Campana, id, cambios);
      }

      if (dto.secciones !== undefined) {
        await manager.delete(CampanaSeccion, { campana_id: id });

        if (dto.secciones.length > 0) {
          const secciones = dto.secciones.map((secDto, index) =>
            manager.create(CampanaSeccion, {
              campana_id: id,
              titulo: secDto.titulo,
              contenido: secDto.contenido,
              orden: secDto.orden ?? index,
              user_crea_id: dto.user_actua_id || campana.user_crea_id,
            }),
          );
          await manager.save(CampanaSeccion, secciones);
        }
      }
    });

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
