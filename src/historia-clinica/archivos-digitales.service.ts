import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { ArchivoDigital } from './entities/archivo-digital.entity';
import { TipoArchivo } from './entities/tipo-archivo.entity';
import { CreateArchivoDigitalDto } from './dto/create-archivo-digital.dto';
import { UpdateArchivoDigitalDto } from './dto/update-archivo-digital.dto';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArchivosDigitalesService {
  logger: any;
  constructor(
    @InjectRepository(ArchivoDigital)
    private archivoDigitalRepository: Repository<ArchivoDigital>,
    @InjectRepository(TipoArchivo)
    private tipoArchivoRepository: Repository<TipoArchivo>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private terapeutaRepository: Repository<TrabajadorCentro>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async create(createArchivoDigitalDto: CreateArchivoDigitalDto): Promise<ArchivoDigital> {
    const terapeuta = await this.terapeutaRepository.findOne({
      where: { id: createArchivoDigitalDto.terapeutaId },
      relations: ['rol'],
    });
    if (!terapeuta) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const tipoArchivo = await this.tipoArchivoRepository.findOne({
      where: { id: createArchivoDigitalDto.tipoArchivoId, activo: 1 },
    });
    if (!tipoArchivo) {
      throw new NotFoundException(
        `Tipo de archivo con ID ${createArchivoDigitalDto.tipoArchivoId} no encontrado o inactivo`,
      );
    }

    let paciente: Paciente | null = null;
    if (createArchivoDigitalDto.pacienteId) {
      paciente = await this.pacienteRepository.findOne({
        where: { id: createArchivoDigitalDto.pacienteId },
      });
      if (!paciente) {
        throw new NotFoundException('Paciente no encontrado');
      }
    }

    const archivoDigital = this.archivoDigitalRepository.create({
      ...createArchivoDigitalDto,
      terapeuta,
      tipoArchivo,
      paciente,
    });

    const archivoGuardado = await this.archivoDigitalRepository.save(archivoDigital);

    if (paciente && terapeuta.rol) {
      try {
        const usuarioNombre = `${terapeuta.nombres} ${terapeuta.apellidos || ''}`.trim();
        const pacienteNombre = `${paciente.nombres} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim();

        // ADMISIÓN (rol 2) sube archivo → notifica a terapeutas asignados Y al administrador
        if (terapeuta.rol.id === 2) {
          const queryTerapeutas = `
            SELECT DISTINCT tc.id
            FROM asignacion_terapeuta at
            INNER JOIN paciente_servicio ps ON ps.id = at.paciente_servicio_id
            INNER JOIN trabajador_centro tc ON tc.id = at.terapeuta_id
            WHERE ps.paciente_id = ?
              AND at.activo = 1
              AND ps.activo = 1
          `;

          const terapeutasAsignados = await this.archivoDigitalRepository.query(queryTerapeutas, [paciente.id]);
          const terapeutasIds: number[] = terapeutasAsignados.map((t: any) => t.id);

          // Notificar a terapeutas asignados (rol 4)
          if (terapeutasIds.length > 0) {
            await this.notificacionesService.notificarDocumentoSubido(
              archivoGuardado.id,
              terapeuta.id,
              usuarioNombre,
              paciente.id,
              pacienteNombre,
              tipoArchivo.nombre,
              terapeutasIds,
            );
          }

          // Notificar al administrador (rol 1)
          await this.notificacionesService.notificarDocumentoSubidoPorAdminOAdmision(
            archivoGuardado.id,
            terapeuta.id,
            usuarioNombre,
            paciente.id,
            pacienteNombre,
            tipoArchivo.nombre,
          );
        }

        // TERAPEUTA (rol 4) sube archivo → notifica solo al administrador
        else if (terapeuta.rol.id === 4) {
          await this.notificacionesService.notificarDocumentoSubidoPorTerapeuta(
            archivoGuardado.id,
            terapeuta.id,
            usuarioNombre,
            paciente.id,
            pacienteNombre,
            tipoArchivo.nombre,
          );
        }
      } catch (error) {
        this.logger?.error?.('Error al crear notificación de documento subido:', error);
      }
    }

    return archivoGuardado;
  }

  async findAll(): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { activo: true },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findByPaciente(
    pacienteId: number,
    trabajadorId?: number,
    rolTrabajador?: string,
    esJefe?: boolean,
  ): Promise<ArchivoDigital[]> {
    const query = this.archivoDigitalRepository
      .createQueryBuilder('archivo')
      .leftJoinAndSelect('archivo.paciente', 'paciente')
      .leftJoinAndSelect('archivo.terapeuta', 'terapeuta')
      .leftJoinAndSelect('terapeuta.rol', 'rol')
      .leftJoinAndSelect('archivo.tipoArchivo', 'tipoArchivo')
      .where('archivo.paciente_id = :pacienteId', { pacienteId })
      .andWhere('archivo.activo = :activo', { activo: true });

    // Terapeuta sin rol de jefa: solo ve sus propios archivos o los subidos por admisión/admin
    if (rolTrabajador?.toLowerCase() === 'terapeuta' && trabajadorId && !esJefe) {
      query.andWhere(
        new Brackets(qb => {
          qb.where('archivo.terapeuta_id = :trabajadorId', { trabajadorId }).orWhere(
            'LOWER(rol.nombre) IN (:...rolesAdmision)',
            { rolesAdmision: ['admin', 'admision', 'administrador', 'admisión'] },
          );
        }),
      );
    }

    return await query.orderBy('archivo.fecha_creacion', 'DESC').getMany();
  }

  async findByTerapeuta(terapeutaId: number): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { terapeuta: { id: terapeutaId }, activo: true },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ArchivoDigital> {
    const archivoDigital = await this.archivoDigitalRepository.findOne({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { id, activo: true },
    });

    if (!archivoDigital) {
      throw new NotFoundException('Archivo digital no encontrado');
    }

    return archivoDigital;
  }

  async update(id: number, updateArchivoDigitalDto: UpdateArchivoDigitalDto): Promise<ArchivoDigital> {
    const archivoDigital = await this.findOne(id);

    if (updateArchivoDigitalDto.terapeutaId) {
      const terapeuta = await this.terapeutaRepository.findOne({
        where: { id: updateArchivoDigitalDto.terapeutaId },
      });
      if (!terapeuta) throw new NotFoundException('Terapeuta no encontrado');
    }

    if (updateArchivoDigitalDto.tipoArchivoId) {
      const tipoArchivo = await this.tipoArchivoRepository.findOne({
        where: { id: updateArchivoDigitalDto.tipoArchivoId },
      });
      if (!tipoArchivo) throw new NotFoundException('Tipo de archivo no encontrado');
    }

    if (updateArchivoDigitalDto.pacienteId) {
      const paciente = await this.pacienteRepository.findOne({
        where: { id: updateArchivoDigitalDto.pacienteId },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
    }

    Object.assign(archivoDigital, updateArchivoDigitalDto);
    return await this.archivoDigitalRepository.save(archivoDigital);
  }

  async remove(id: number): Promise<{ message: string; paciente?: any }> {
    const archivoDigital = await this.findOne(id);

    try {
      const rutaCompleta = path.join(process.cwd(), 'uploads', archivoDigital.rutaArchivo);
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta);
      }
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
    }

    archivoDigital.activo = false;
    await this.archivoDigitalRepository.save(archivoDigital);

    return {
      message: 'Archivo eliminado correctamente',
      paciente: archivoDigital.paciente
        ? {
            id: archivoDigital.paciente.id,
            nombres: archivoDigital.paciente.nombres,
            apellidos: `${archivoDigital.paciente.apellido_paterno} ${archivoDigital.paciente.apellido_materno}`.trim(),
          }
        : null,
    };
  }

  async findByTerapeutaAndPaciente(terapeutaId: number, pacienteId: number): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: {
        terapeuta: { id: terapeutaId },
        paciente: { id: pacienteId },
        activo: true,
      },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findAllTiposArchivo(): Promise<TipoArchivo[]> {
    return await this.tipoArchivoRepository.find({
      where: { activo: 1 },
      order: { nombre: 'ASC' },
    });
  }
}