// src/archivos/archivos-oficiales.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivoOficial } from './entities/archivo-oficial.entity';
import { CrearArchivoOficialDto } from './dto/crear-archivo-oficial.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ArchivosOficialesService {
  private readonly uploadPath = './uploads/archivos-oficiales';

  constructor(
    @InjectRepository(ArchivoOficial)
    private archivoOficialRepo: Repository<ArchivoOficial>,
  ) {
    this.createUploadDirectory();
  }

  private async createUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio:', error);
    }
  }

  // ============================================
  // GENERAR CÓDIGO CTC ALFANUMÉRICO
  // ============================================
  private generarCodigoCTC(): string {
    const caracteres = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codigo = '';
    
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * caracteres.length);
      codigo += caracteres[randomIndex];
    }
    
    return `CTC-${codigo}`;
  }

  private async generarCodigoUnico(): Promise<string> {
    let codigo: string;
    let existe: boolean;

    do {
      codigo = this.generarCodigoCTC();
      const encontrado = await this.archivoOficialRepo.findOne({
        where: { codigoValidacion: codigo }
      });
      existe = !!encontrado;
    } while (existe);

    return codigo;
  }

  async generarCodigoPreview(): Promise<string> {
    return await this.generarCodigoUnico();
  }

  // ============================================
  // ✅ FUNCIÓN AUXILIAR: Convertir string YYYY-MM-DD a Date sin zona horaria
  // ============================================
  private parseLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // ============================================
  // SUBIR ARCHIVO OFICIAL (ACTUALIZADO)
  // ============================================
  async subirArchivo(
    file: Express.Multer.File,
    dto: CrearArchivoOficialDto,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<ArchivoOficial> {
    // Validar que solo admin o admisión puedan subir
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('Solo admin y admisión pueden subir archivos oficiales');
    }

    // ✅ VALIDAR QUE SOLO UNO ESTÉ PRESENTE
    if (!dto.pacienteId && !dto.trabajadorId) {
      throw new BadRequestException('Debe seleccionar un paciente o un trabajador');
    }

    if (dto.pacienteId && dto.trabajadorId) {
      throw new BadRequestException('No puede seleccionar paciente y trabajador al mismo tiempo');
    }

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
    ];

    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo PDF, Word, JPG, PNG');
    }

    // Generar nombre único para el archivo
    const extension = path.extname(file.originalname);
    const nombreArchivo = `${uuidv4()}${extension}`;
    const rutaCompleta = path.join(this.uploadPath, nombreArchivo);

    // Guardar archivo en disco
    await fs.writeFile(rutaCompleta, file.buffer);

    // ============================================
    // DECIDIR QUÉ CÓDIGO USAR
    // ============================================
    let codigoValidacion: string;
    
    if (dto.codigoManual) {
      if (!/^CTC-[0-9A-Z]{8}$/.test(dto.codigoManual)) {
        await fs.unlink(rutaCompleta);
        throw new BadRequestException('El código debe tener el formato CTC-XXXXXXXX');
      }
      
      const existe = await this.archivoOficialRepo.findOne({
        where: { codigoValidacion: dto.codigoManual }
      });
      
      if (existe) {
        await fs.unlink(rutaCompleta);
        throw new BadRequestException('El código ingresado ya existe en el sistema');
      }
      
      codigoValidacion = dto.codigoManual;
    } else {
      codigoValidacion = await this.generarCodigoUnico();
    }

    // ✅ CREAR ARCHIVO CON PACIENTE O TRABAJADOR
    const archivo = this.archivoOficialRepo.create({
      pacienteId: dto.pacienteId || null,
      trabajadorId: dto.trabajadorId || null,
      terapeutaId: dto.terapeutaId||null,
      trabajadorSubioId: trabajadorId,
      tipoArchivoId: dto.tipoArchivoId,
      nombreArchivo,
      nombreOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamano: file.size,
      rutaArchivo: rutaCompleta,
      descripcion: dto.descripcion,
      codigoValidacion,
      fechaEmision: this.parseLocalDate(dto.fechaEmision),
      fechaVigencia: dto.fechaVigencia ? this.parseLocalDate(dto.fechaVigencia) : null,
    });

    return await this.archivoOficialRepo.save(archivo);
  }

  // ============================================
  // LISTAR ARCHIVOS (ACTUALIZADO)
  // ============================================
  async listarArchivos(
    rolTrabajador: string,
    pacienteId?: number,
    trabajadorId?: number,
  ): Promise<ArchivoOficial[]> {
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('No tienes permisos para ver archivos oficiales');
    }

    const query = this.archivoOficialRepo
      .createQueryBuilder('archivo')
      .leftJoinAndSelect('archivo.paciente', 'paciente')
      .leftJoinAndSelect('archivo.trabajador', 'trabajador')
      .leftJoinAndSelect('archivo.terapeuta', 'terapeuta')
      .leftJoinAndSelect('archivo.trabajadorSubio', 'trabajadorSubio')
      .leftJoinAndSelect('archivo.tipoArchivo', 'tipoArchivo')
      .where('archivo.activo = :activo', { activo: 1 });

    if (pacienteId) {
      query.andWhere('archivo.pacienteId = :pacienteId', { pacienteId });
    }

    if (trabajadorId) {
      query.andWhere('archivo.trabajadorId = :trabajadorId', { trabajadorId });
    }

    return await query.orderBy('archivo.fechaCreacion', 'DESC').getMany();
  }

  // ============================================
  // OBTENER ARCHIVO (SIN CAMBIOS)
  // ============================================
  async obtenerArchivo(
    id: number,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<{ buffer: Buffer; mimetype: string; filename: string }> {
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('No tienes permisos');
    }

    const archivo = await this.archivoOficialRepo.findOne({
      where: { id, activo: 1 },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const buffer = await fs.readFile(archivo.rutaArchivo);

    return {
      buffer,
      mimetype: archivo.tipoMime,
      filename: archivo.nombreOriginal,
    };
  }

  // ============================================
  // ELIMINAR ARCHIVO (SIN CAMBIOS)
  // ============================================
  async eliminarArchivo(
    id: number,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<void> {
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('No tienes permisos');
    }

    const archivo = await this.archivoOficialRepo.findOne({
      where: { id, activo: 1 },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    archivo.activo = 0;
    await this.archivoOficialRepo.save(archivo);
  }
    /**
   * Determina si el estado es activo o inactivo
   */
  private determinarEstadoActividad(nombreEstado: string): 'activo' | 'inactivo' {
    if (!nombreEstado) return 'inactivo';
    
    // Si el estado es exactamente 'Inactivo', retorna inactivo
    if (nombreEstado === 'Inactivo') {
      return 'inactivo';
    }
    
    // Cualquier otro estado (Nuevo, Entrevista, Evaluacion, Terapia) es activo
    return 'activo';
  }

// ============================================
// VALIDAR DOCUMENTO (VERSIÓN FINAL CORREGIDA)
// ============================================
async validarDocumento(codigoValidacion: string) {
  const archivo = await this.archivoOficialRepo.findOne({
    where: { codigoValidacion },
    relations: ['paciente', 'paciente.estado', 'trabajador', 'terapeuta', 'tipoArchivo'],
  });

  if (!archivo) {
    throw new NotFoundException('Documento no encontrado');
  }

  const ocultarDNI = (dni: string): string => {
    if (!dni || dni.length < 4) return '****';
    return '*'.repeat(dni.length - 4) + dni.slice(-4);
  };

  const formatearFechaSinZonaHoraria = (fecha: Date | string): string => {
    if (!fecha) return null;
    
    let fechaObj: Date;
    
    if (typeof fecha === 'string') {
      if (fecha.includes('T')) {
        fechaObj = new Date(fecha);
      } else {
        const [year, month, day] = fecha.split('-').map(Number);
        fechaObj = new Date(year, month - 1, day);
      }
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      return null;
    }
    
    if (isNaN(fechaObj.getTime())) return null;
    
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const estaVigente = (fechaVigencia: Date | string): boolean => {
    if (!fechaVigencia) {
      return true;
    }
    
    let fechaVigenciaObj: Date;
    
    if (typeof fechaVigencia === 'string') {
      if (fechaVigencia.includes('T')) {
        fechaVigenciaObj = new Date(fechaVigencia);
      } else {
        const [year, month, day] = fechaVigencia.split('-').map(Number);
        fechaVigenciaObj = new Date(year, month - 1, day, 23, 59, 59, 999);
      }
    } else if (fechaVigencia instanceof Date) {
      fechaVigenciaObj = new Date(fechaVigencia);
      fechaVigenciaObj.setHours(23, 59, 59, 999);
    } else {
      return false;
    }
    
    const ahora = new Date();
    return fechaVigenciaObj > ahora;
  };

  const fechaEmisionFormateada = formatearFechaSinZonaHoraria(archivo.fechaEmision);
  const fechaVigenciaFormateada = archivo.fechaVigencia 
    ? formatearFechaSinZonaHoraria(archivo.fechaVigencia) 
    : null;
  const vigente = estaVigente(archivo.fechaVigencia);

  // ✅ DETERMINAR SI ES PACIENTE O TRABAJADOR
  let destinatario: any;
  let tipoDestinatario: 'paciente' | 'trabajador';

  if (archivo.pacienteId && archivo.paciente) {
    tipoDestinatario = 'paciente';
    destinatario = {
      nombres: archivo.paciente.nombres || 'Sin nombre',
      apellidos: `${archivo.paciente.apellido_paterno || ''} ${archivo.paciente.apellido_materno || ''}`.trim() || 'Sin apellidos',
      dni: ocultarDNI(archivo.paciente.numero_documento),

      estado: archivo.paciente.estado || null,
    };
  } else if (archivo.trabajadorId && archivo.trabajador) {
    tipoDestinatario = 'trabajador';
    destinatario = {
      nombres: archivo.trabajador.nombres || 'Sin nombre',
      apellidos: archivo.trabajador.apellidos || 'Sin apellidos',
      dni: ocultarDNI(archivo.trabajador.dni),
      activo: archivo.trabajador.estado === true,
      especialidad: archivo.trabajador.especialidad || null,
    };
  } else {
    throw new NotFoundException('El documento no tiene paciente ni trabajador asignado');
  }

  // ✅ CRÍTICO: VALIDAR SI TERAPEUTA EXISTE ANTES DE ACCEDER A SUS PROPIEDADES
  let terapeutaData = null;
  if (archivo.terapeuta) {
    terapeutaData = {
      nombres: archivo.terapeuta.nombres || 'Sin nombre',
      apellidos: archivo.terapeuta.apellidos || 'Sin apellidos',
    };
  }

  return {
    valido: true,
    codigo: archivo.codigoValidacion,
    tipoDocumento: archivo.tipoArchivo?.nombre || 'Sin especificar',
    tipoDestinatario, // 'paciente' o 'trabajador'
    destinatario, // datos del paciente o trabajador (DNI cifrado)
    
    // MANTENER COMPATIBILIDAD CON CÓDIGO ANTERIOR
    paciente: tipoDestinatario === 'paciente' ? destinatario : null,
    trabajador: tipoDestinatario === 'trabajador' ? destinatario : null,
    
    terapeuta: terapeutaData, // ✅ PUEDE SER NULL - el frontend lo maneja
    
    fechaEmision: fechaEmisionFormateada,
    fechaVigencia: fechaVigenciaFormateada,
    vigente: vigente,
    urlVerificacion: `${process.env.FRONTEND_URL || 'https://www.crecemos.com.pe'}/verificar-documento`,
  };
}
}