import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Postulacion } from './postulacion.entity';
import { Comentario } from './comentario.entity';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionDto } from './dto/update-postulacion.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';

@Injectable()
export class PostulacionesService {
  // CAMBIO: Usar 'cvs' en lugar de 'cv'
  private readonly uploadDir = './uploads/cvs';

  constructor(
    @InjectRepository(Postulacion)
    private postulacionRepository: Repository<Postulacion>,
    @InjectRepository(Comentario)
    private comentarioRepository: Repository<Comentario>,
  ) {
    // Crear el directorio si no existe
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      console.log(`✅ Directorio creado: ${this.uploadDir}`);
    } else {
      console.log(`✅ Directorio ya existe: ${this.uploadDir}`);
    }
  }

  async create(
  createPostulacionDto: CreatePostulacionDto,
  file?: Express.Multer.File,
): Promise<Postulacion> {
  try {
    
    if (!file) {
      throw new BadRequestException('El archivo CV es obligatorio');
    }

    // Asignar estado por defecto
    if (!createPostulacionDto.estado_postulacion) {
      createPostulacionDto.estado_postulacion = 'Nuevo';
    }

    // ✅ CAMBIO: Usar file.filename en lugar de guardar manualmente
    // El archivo ya fue guardado por multer en diskStorage
    createPostulacionDto.documentos_adjuntos = `/uploads/cvs/${file.filename}`;

    const postulacion = this.postulacionRepository.create(createPostulacionDto);
    const result = await this.postulacionRepository.save(postulacion);
    
    return result;
  } catch (error) {
    console.error('❌ Error creating postulación:', error);
    throw new BadRequestException(error.message || 'Error al crear la postulación');
  }

  }

  private async guardarArchivo(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `cv-${uniqueSuffix}.pdf`;
    const filepath = join(this.uploadDir, filename);


    const fs = require('fs').promises;
    await fs.writeFile(filepath, file.buffer);


    // CAMBIO: Retornar la ruta con 'cvs'
    return `/uploads/cvs/${filename}`;
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
        .orderBy('postulacion.fecha_postulacion', 'DESC');

      if (filters?.estado_postulacion) {
        query.andWhere('postulacion.estado_postulacion = :estado_postulacion', { 
          estado_postulacion: filters.estado_postulacion 
        });
      }

      if (filters?.distrito) {
        query.andWhere('postulacion.distrito LIKE :distrito', { 
          distrito: `%${filters.distrito}%` 
        });
      }

      if (filters?.cargo_postulado) {
        query.andWhere('postulacion.cargo_postulado LIKE :cargo_postulado', { 
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
      
      return postulaciones;
    } catch (error) {
      console.error('Error en findAll:', error);
      throw new BadRequestException('Error al obtener las postulaciones');
    }
  }

  async findOne(id: number): Promise<Postulacion> {
    try {
      const postulacion = await this.postulacionRepository.findOne({
        where: { id_postulacion: id },
        relations: ['comentarios'],
      });

      if (!postulacion) {
        throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
      }

      return postulacion;
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
      Object.assign(postulacion, updatePostulacionDto);
      return await this.postulacionRepository.save(postulacion);
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
          console.log('✅ Archivo eliminado:', filepath);
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


      // Extraer el nombre del archivo de la ruta
      const filename = postulacion.documentos_adjuntos.split('/').pop();
      const filepath = join(this.uploadDir, filename);


      if (!existsSync(filepath)) {
        throw new NotFoundException(`Archivo CV no encontrado en el servidor: ${filepath}`);
      }

      const finalFilename = `${postulacion.nombre}_${postulacion.apellido}_CV.pdf`;
      console.log('✅ CV encontrado, nombre final:', finalFilename);

      return { 
        filepath, 
        filename: finalFilename
      };
    } catch (error) {
      console.error('❌ Error en getCVFile:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el CV');
    }
  }

  async getEstadisticas() {
    try {
      const total = await this.postulacionRepository.count();
      
      const porEstado = await this.postulacionRepository
        .createQueryBuilder('postulacion')
        .select('postulacion.estado_postulacion, COUNT(*) as count')
        .groupBy('postulacion.estado_postulacion')
        .getRawMany();

      return {
        total,
        porEstado,
      };
    } catch (error) {
      console.error('Error en getEstadisticas:', error);
      throw new BadRequestException('Error al obtener estadísticas');
    }
  }
}