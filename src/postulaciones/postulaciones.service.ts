import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Postulacion } from './postulacion.entity';
import { Comentario } from './comentario.entity';
import { CargoPostulacion } from './cargo-postulacion.entity';
import { EstadoPostulacion } from './estado-postulacion.entity';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionDto } from './dto/update-postulacion.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';

@Injectable()
export class PostulacionesService {
  private readonly uploadDir = './uploads/cvs';

  constructor(
    @InjectRepository(Postulacion)
    private postulacionRepository: Repository<Postulacion>,
    @InjectRepository(Comentario)
    private comentarioRepository: Repository<Comentario>,
    @InjectRepository(CargoPostulacion)
    private cargoRepository: Repository<CargoPostulacion>,
    @InjectRepository(EstadoPostulacion)
    private estadoRepository: Repository<EstadoPostulacion>,
  ) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ✅ Método helper para convertir strings a IDs
  private async resolverCargo(cargoDescripcion: string): Promise<CargoPostulacion> {
    const cargo = await this.cargoRepository.findOne({
      where: { descripcion: cargoDescripcion, activo: 1 }
    });
    
    if (!cargo) {
      throw new BadRequestException(`Cargo "${cargoDescripcion}" no encontrado`);
    }
    
    return cargo;
  }

  private async resolverEstado(estadoDescripcion: string): Promise<EstadoPostulacion> {
    const estado = await this.estadoRepository.findOne({
      where: { descripcion: estadoDescripcion }
    });
    
    if (!estado) {
      throw new BadRequestException(`Estado "${estadoDescripcion}" no encontrado`);
    }
    
    return estado;
  }

  // ✅ Método helper para agregar campos virtuales
  private mapearPostulacion(postulacion: Postulacion): Postulacion {
    if (postulacion.cargoPostulacionRelacion) {
      postulacion.cargo_postulado = postulacion.cargoPostulacionRelacion.descripcion;
    }
    if (postulacion.estadoPostulacionRelacion) {
      postulacion.estado_postulacion = postulacion.estadoPostulacionRelacion.descripcion;
    }
    return postulacion;
  }

  async create(
    createPostulacionDto: CreatePostulacionDto,
    file?: Express.Multer.File,
  ): Promise<Postulacion> {
    try {
      if (!file) {
        throw new BadRequestException('El archivo CV es obligatorio');
      }

      // ✅ Asignar estado por defecto si no viene
      const estadoDescripcion = createPostulacionDto.estado_postulacion || 'Nuevo';

      // ✅ Resolver cargo y estado a sus entidades
      const cargo = await this.resolverCargo(createPostulacionDto.cargo_postulado);
      const estado = await this.resolverEstado(estadoDescripcion);

      // ✅ Crear postulación con las relaciones
      const postulacion = this.postulacionRepository.create({
        nombre: createPostulacionDto.nombre,
        apellido: createPostulacionDto.apellido,
        email: createPostulacionDto.email,
        telefono: createPostulacionDto.telefono,
        distrito: createPostulacionDto.distrito,
        cargoPostulacionRelacion: cargo,
        estadoPostulacionRelacion: estado,
        documentos_adjuntos: `/uploads/cvs/${file.filename}`,
      });

      const result = await this.postulacionRepository.save(postulacion);
      
      // ✅ Mapear campos virtuales antes de retornar
      return this.mapearPostulacion(result);
    } catch (error) {
      console.error('❌ Error creating postulación:', error);
      throw new BadRequestException(error.message || 'Error al crear la postulación');
    }
  }

  async findAll(filters?: {
    estado_postulacion?: string;
    distrito?: string;
    cargo_postulado?: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    search?: string;
  }): Promise<Postulacion[]> {
    try {
      const query = this.postulacionRepository
        .createQueryBuilder('postulacion')
        .leftJoinAndSelect('postulacion.comentarios', 'comentarios')
        .leftJoinAndSelect('postulacion.cargoPostulacionRelacion', 'cargo')
        .leftJoinAndSelect('postulacion.estadoPostulacionRelacion', 'estado')
        .orderBy('postulacion.fecha_postulacion', 'DESC');

      // ✅ Filtrar por estado (ahora usando la relación)
      if (filters?.estado_postulacion) {
        query.andWhere('estado.descripcion = :estado_postulacion', { 
          estado_postulacion: filters.estado_postulacion 
        });
      }

      if (filters?.distrito) {
        query.andWhere('postulacion.distrito LIKE :distrito', { 
          distrito: `%${filters.distrito}%` 
        });
      }

      // ✅ Filtrar por cargo (ahora usando la relación)
      if (filters?.cargo_postulado) {
        query.andWhere('cargo.descripcion LIKE :cargo_postulado', { 
          cargo_postulado: `%${filters.cargo_postulado}%` 
        });
      }

      if (filters?.search) {
        query.andWhere('(postulacion.nombre LIKE :search OR postulacion.apellido LIKE :search OR postulacion.email LIKE :search)', { 
          search: `%${filters.search}%` 
        });
      }

      if (filters?.fechaInicio && filters?.fechaFin) {
        query.andWhere('postulacion.fecha_postulacion BETWEEN :fechaInicio AND :fechaFin', {
          fechaInicio: filters.fechaInicio,
          fechaFin: filters.fechaFin
        });
      }

      const postulaciones = await query.getMany();
      
      // ✅ Mapear campos virtuales para todas las postulaciones
      return postulaciones.map(p => this.mapearPostulacion(p));
    } catch (error) {
      console.error('Error en findAll:', error);
      throw new BadRequestException('Error al obtener las postulaciones');
    }
  }

  async findOne(id: number): Promise<Postulacion> {
    try {
      const postulacion = await this.postulacionRepository.findOne({
        where: { id_postulacion: id },
        relations: ['comentarios', 'cargoPostulacionRelacion', 'estadoPostulacionRelacion'],
      });

      if (!postulacion) {
        throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
      }

      return this.mapearPostulacion(postulacion);
    } catch (error) {
      console.error('Error en findOne:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la postulación');
    }
  }

  async update(id: number, updatePostulacionDto: UpdatePostulacionDto): Promise<Postulacion> {
    try {
      const postulacion = await this.findOne(id);
      
      // ✅ Si se actualiza el cargo, resolver el nuevo cargo
      if (updatePostulacionDto.cargo_postulado) {
        const cargo = await this.resolverCargo(updatePostulacionDto.cargo_postulado);
        postulacion.cargoPostulacionRelacion = cargo;
      }
      
      // ✅ Si se actualiza el estado, resolver el nuevo estado
      if (updatePostulacionDto.estado_postulacion) {
        const estado = await this.resolverEstado(updatePostulacionDto.estado_postulacion);
        postulacion.estadoPostulacionRelacion = estado;
      }

      // ✅ Actualizar otros campos
      Object.assign(postulacion, {
        nombre: updatePostulacionDto.nombre,
        apellido: updatePostulacionDto.apellido,
        email: updatePostulacionDto.email,
        telefono: updatePostulacionDto.telefono,
        distrito: updatePostulacionDto.distrito,
      });

      const result = await this.postulacionRepository.save(postulacion);
      return this.mapearPostulacion(result);
    } catch (error) {
      console.error('Error en update:', error);
      throw new BadRequestException('Error al actualizar la postulación');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const postulacion = await this.findOne(id);
      
      if (postulacion.documentos_adjuntos) {
        const filename = postulacion.documentos_adjuntos.split('/').pop();
        const filepath = join(this.uploadDir, filename);
        
        if (existsSync(filepath)) {
          unlinkSync(filepath);
        }
      }

      await this.postulacionRepository.remove(postulacion);
    } catch (error) {
      console.error('Error en remove:', error);
      throw new BadRequestException('Error al eliminar la postulación');
    }
  }

  async addComentario(createComentarioDto: CreateComentarioDto): Promise<Comentario> {
    try {
      await this.findOne(createComentarioDto.id_postulacion);
      const comentario = this.comentarioRepository.create(createComentarioDto);
      return await this.comentarioRepository.save(comentario);
    } catch (error) {
      console.error('Error en addComentario:', error);
      throw new BadRequestException('Error al agregar comentario');
    }
  }

  async getComentariosByPostulacion(idPostulacion: number): Promise<Comentario[]> {
    try {
      return await this.comentarioRepository.find({
        where: { id_postulacion: idPostulacion },
        order: { fecha_comentario: 'DESC' },
      });
    } catch (error) {
      console.error('Error en getComentariosByPostulacion:', error);
      throw new BadRequestException('Error al obtener comentarios');
    }
  }

  async getCVFile(id: number): Promise<{ filepath: string; filename: string }> {
    try {
      const postulacion = await this.findOne(id);
      
      if (!postulacion.documentos_adjuntos) {
        throw new NotFoundException('CV no encontrado en la base de datos');
      }

      const filename = postulacion.documentos_adjuntos.split('/').pop();
      const filepath = join(this.uploadDir, filename);

      if (!existsSync(filepath)) {
        throw new NotFoundException(`Archivo CV no encontrado en el servidor: ${filepath}`);
      }

      const finalFilename = `${postulacion.nombre}_${postulacion.apellido}_CV.pdf`;

      return { filepath, filename: finalFilename };
    } catch (error) {
      console.error('❌ Error en getCVFile:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el CV');
    }
  }



  async getEstadisticasPorEstados() {
    try {
      const total = await this.postulacionRepository.count();
      
      // Obtener todos los estados disponibles
      const todosLosEstados = await this.estadoRepository.find({
        where: { activo: 1 },
        order: { descripcion: 'ASC' }
      });

      // Obtener conteo por estado de las postulaciones existentes
      const estadosConCantidad = await this.postulacionRepository
        .createQueryBuilder('postulacion')
        .leftJoin('postulacion.estadoPostulacionRelacion', 'estado')
        .select('estado.descripcion', 'nombre')
        .addSelect('COUNT(postulacion.id_postulacion)', 'cantidad')
        .groupBy('estado.descripcion')
        .getRawMany();

      // Crear un mapa para acceso rápido a las cantidades
      const cantidadPorEstado = new Map();
      estadosConCantidad.forEach(estado => {
        cantidadPorEstado.set(estado.nombre, parseInt(estado.cantidad));
      });

      // Crear el array final con todos los estados, incluyendo los que tienen cantidad 0
      const estados = todosLosEstados.map(estado => ({
        nombre: estado.descripcion,
        cantidad: cantidadPorEstado.get(estado.descripcion) || 0
      }));

      return {
        total,
        estados
      };
    } catch (error) {
      console.error('Error en getEstadisticasPorEstados:', error);
      throw new BadRequestException('Error al obtener estadísticas por estados');
    }
  }
}