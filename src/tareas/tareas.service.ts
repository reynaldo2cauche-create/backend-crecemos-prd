import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Tarea } from './entities/tarea.entity';
import { TareaAsignacion } from './entities/tarea-asignacion.entity';
import { TareaComentario } from './entities/tarea-comentario.entity';
import { TareaPrioridad } from './entities/tarea-prioridad.entity';
import { TareaColumna } from './entities/tarea-columna.entity';
import { TareaArchivo } from './entities/tarea-archivo.entity';
import { TareaComentarioArchivo } from './entities/tarea-comentario-archivo.entity';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';

const ROL_ADMIN = 1;

@Injectable()
export class TareasService {
  constructor(
    @InjectRepository(Tarea)
    private tareaRepo: Repository<Tarea>,
    @InjectRepository(TareaAsignacion)
    private asignacionRepo: Repository<TareaAsignacion>,
    @InjectRepository(TareaComentario)
    private comentarioRepo: Repository<TareaComentario>,
    @InjectRepository(TareaPrioridad)
    private prioridadRepo: Repository<TareaPrioridad>,
    @InjectRepository(TareaColumna)
    private columnaRepo: Repository<TareaColumna>,
    @InjectRepository(TareaArchivo)
    private archivoRepo: Repository<TareaArchivo>,
    @InjectRepository(TareaComentarioArchivo)
    private comentarioArchivoRepo: Repository<TareaComentarioArchivo>,
  ) {}

  // ─── Catálogos ──────────────────────────────────────────────────────────────

  async listarPrioridades() {
    return this.prioridadRepo.find({ order: { orden: 'ASC' } });
  }

  async listarColumnas() {
    return this.columnaRepo.find({ order: { orden: 'ASC' } });
  }

  async crearColumna(datos: { nombre: string; color: string; es_final: boolean }, userId: number) {
    const maxOrden = await this.columnaRepo.maximum('orden') ?? 0;
    const col = this.columnaRepo.create({
      nombre: datos.nombre,
      color: datos.color,
      es_final: datos.es_final,
      orden: maxOrden + 1,
      user_crea_id: userId,
      user_actua_id: userId,
    });
    return this.columnaRepo.save(col);
  }

  async reordenarColumnas(ids: number[], userId: number) {
    await Promise.all(ids.map((id, i) =>
      this.columnaRepo.update(id, { orden: i + 1, user_actua_id: userId })
    ));
    return this.listarColumnas();
  }

  async eliminarColumna(id: number) {
    const col = await this.columnaRepo.findOne({ where: { id } });
    if (!col) throw new NotFoundException(`Columna #${id} no encontrada`);
    const tareasEnColumna = await this.tareaRepo.count({ where: { columna_id: id } });
    if (tareasEnColumna > 0) throw new BadRequestException('No se puede eliminar una columna que tiene tareas asignadas');
    await this.columnaRepo.remove(col);
    return { message: 'Columna eliminada' };
  }

  // ─── Tareas ─────────────────────────────────────────────────────────────────

  async listar(userId: number, rolId: number) {
    const todas = await this.tareaRepo.find({
      order: { fecha_limite: 'ASC', created_at: 'DESC' },
    });

    // Administrador ve todo
    if (rolId === ROL_ADMIN) return todas;

    // Otros: solo tareas asignadas a su usuario o su rol
    return todas.filter(t =>
      t.asignaciones?.some(a =>
        (a.usuario_id && a.usuario_id === userId) ||
        (a.rol_id && a.rol_id === rolId)
      )
    );
  }

  async obtenerPorId(id: number) {
    const tarea = await this.tareaRepo.findOne({ where: { id } });
    if (!tarea) throw new NotFoundException(`Tarea #${id} no encontrada`);
    return tarea;
  }

  async crear(dto: CreateTareaDto, userId: number) {
    const tarea = this.tareaRepo.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      prioridad_id: dto.prioridad_id ?? 2,
      columna_id: dto.columna_id ?? 1,
      fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      user_crea_id: userId,
      user_actua_id: userId,
    });

    const tareaGuardada = await this.tareaRepo.save(tarea);

    if (dto.asignaciones?.length) {
      await this.guardarAsignaciones(tareaGuardada.id, dto.asignaciones, userId);
    }

    return this.obtenerPorId(tareaGuardada.id);
  }

  async actualizar(id: number, dto: UpdateTareaDto, userId: number) {
    const updateData: Record<string, any> = { user_actua_id: userId };

    if (dto.titulo) updateData.titulo = dto.titulo;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.prioridad_id) updateData.prioridad_id = dto.prioridad_id;
    if (dto.columna_id) updateData.columna_id = dto.columna_id;
    if (dto.fecha_limite !== undefined) updateData.fecha_limite = dto.fecha_limite ? new Date(dto.fecha_limite) : null;

    // Si la nueva columna es final, pausar timer
    if (dto.columna_id) {
      const columna = await this.columnaRepo.findOne({ where: { id: dto.columna_id } });
      if (columna?.es_final) {
        const tarea = await this.obtenerPorId(id);
        if (tarea.timer_activo) {
          updateData.tiempo_acumulado = this.calcularTiempoAcumulado(tarea);
          updateData.timer_activo = false;
          updateData.timer_inicio = null;
        }
      }
    }

    await this.tareaRepo.update(id, updateData);

    if (dto.asignaciones !== undefined) {
      await this.asignacionRepo.delete({ tarea_id: id });
      if (dto.asignaciones.length) {
        await this.guardarAsignaciones(id, dto.asignaciones, userId);
      }
    }

    return this.obtenerPorId(id);
  }

  async moverColumna(id: number, columnaId: number, userId: number) {
    const columna = await this.columnaRepo.findOne({ where: { id: columnaId } });
    if (!columna) throw new NotFoundException(`Columna #${columnaId} no encontrada`);

    const updateData: Record<string, any> = { columna_id: columnaId, user_actua_id: userId };

    // Si la columna destino es final, pausar timer
    if (columna.es_final) {
      const tarea = await this.obtenerPorId(id);
      if (tarea.timer_activo) {
        updateData.tiempo_acumulado = this.calcularTiempoAcumulado(tarea);
        updateData.timer_activo = false;
        updateData.timer_inicio = null;
      }
    }

    await this.tareaRepo.update(id, updateData);
    return this.obtenerPorId(id);
  }

  async eliminar(id: number) {
    const tarea = await this.obtenerPorId(id);
    await this.tareaRepo.remove(tarea);
    return { message: 'Tarea eliminada correctamente' };
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  async iniciarTimer(id: number) {
    const tarea = await this.obtenerPorId(id);
    if (tarea.timer_activo) throw new BadRequestException('El timer ya está activo');

    await this.tareaRepo.update(id, { timer_activo: true, timer_inicio: new Date() });
    return this.obtenerPorId(id);
  }

  async pausarTimer(id: number) {
    const tarea = await this.obtenerPorId(id);
    if (!tarea.timer_activo) throw new BadRequestException('El timer no está activo');

    await this.tareaRepo.update(id, {
      tiempo_acumulado: this.calcularTiempoAcumulado(tarea),
      timer_activo: false,
      timer_inicio: null,
    });
    return this.obtenerPorId(id);
  }

  // ─── Comentarios ────────────────────────────────────────────────────────────

  async listarComentarios(tareaId: number) {
    return this.comentarioRepo.find({
      where: { tarea_id: tareaId },
      order: { created_at: 'ASC' },
    });
  }

  async agregarComentario(tareaId: number, dto: CreateComentarioDto, userId: number, files?: Express.Multer.File[]) {
    await this.obtenerPorId(tareaId);
    const comentario = await this.comentarioRepo.save(
      this.comentarioRepo.create({
        tarea_id: tareaId,
        contenido: dto.contenido?.trim() || '',
        user_crea_id: userId,
        user_actua_id: userId,
      })
    );
    if (files?.length) {
      const archivos = files.map(f => this.comentarioArchivoRepo.create({
        comentario_id: comentario.id,
        nombre_original: f.originalname,
        nombre_guardado: f.filename,
        url: `/uploads/tareas/${f.filename}`,
        tipo_mime: f.mimetype,
        tamanio: f.size,
        user_crea_id: userId,
      }));
      await this.comentarioArchivoRepo.save(archivos);
    }
    return this.comentarioRepo.findOne({ where: { id: comentario.id } });
  }

  // ─── Archivos ───────────────────────────────────────────────────────────────

  async listarArchivos(tareaId: number): Promise<TareaArchivo[]> {
    return this.archivoRepo.find({
      where: { tarea_id: tareaId },
      order: { created_at: 'ASC' },
    });
  }

  async guardarArchivo(tareaId: number, file: Express.Multer.File, userId: number): Promise<TareaArchivo> {
    await this.obtenerPorId(tareaId);
    const archivo = this.archivoRepo.create({
      tarea_id: tareaId,
      nombre_original: file.originalname,
      nombre_guardado: file.filename,
      url: `/uploads/tareas/${file.filename}`,
      tipo_mime: file.mimetype,
      tamanio: file.size,
      user_crea_id: userId,
    });
    return this.archivoRepo.save(archivo);
  }

  async eliminarArchivo(archivoId: number): Promise<{ message: string }> {
    const archivo = await this.archivoRepo.findOne({ where: { id: archivoId } });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    const filePath = path.join('./uploads/tareas', archivo.nombre_guardado);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.archivoRepo.delete(archivoId);
    return { message: 'Archivo eliminado' };
  }

  // ─── Reporte mensual ────────────────────────────────────────────────────────

  async reporteMensual(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59);

    const tareas = await this.tareaRepo
      .createQueryBuilder('t')
      .where('t.created_at BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('t.fecha_limite', 'ASC')
      .getMany();

    const completadas = tareas.filter(t => t.columna?.es_final && t.columna?.nombre === 'Completado');
    const vencidas = tareas.filter(t => t.fecha_limite && new Date(t.fecha_limite) < new Date() && !t.columna?.es_final);
    const tiempoTotal = tareas.reduce((acc, t) => acc + (t.tiempo_acumulado || 0), 0);

    return {
      mes,
      anio,
      resumen: {
        total: tareas.length,
        completadas: completadas.length,
        vencidas: vencidas.length,
        tiempo_total_segundos: tiempoTotal,
        tiempo_total_horas: (tiempoTotal / 3600).toFixed(2),
      },
      tareas,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private calcularTiempoAcumulado(tarea: Tarea): number {
    if (!tarea.timer_inicio) return tarea.tiempo_acumulado;
    const segundosTranscurridos = Math.floor((Date.now() - new Date(tarea.timer_inicio).getTime()) / 1000);
    return tarea.tiempo_acumulado + segundosTranscurridos;
  }

  private async guardarAsignaciones(tareaId: number, asignaciones: { usuario_id?: number; rol_id?: number }[], userId: number) {
    const entidades = asignaciones
      .filter(a => a.usuario_id || a.rol_id)
      .map(a => this.asignacionRepo.create({
        tarea_id: tareaId,
        usuario_id: a.usuario_id ?? null,
        rol_id: a.rol_id ?? null,
        user_crea_id: userId,
        user_actua_id: userId,
      }));
    await this.asignacionRepo.save(entidades);
  }
}
