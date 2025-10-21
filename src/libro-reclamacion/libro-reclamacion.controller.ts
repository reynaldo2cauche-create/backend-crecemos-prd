import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Res,
  StreamableFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { createReadStream, existsSync } from 'fs';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

import { LibroReclamacionService } from './libro-reclamacion.service';
import { CreateLibroReclamacionDto } from './dto/create-libro-reclamacion.dto';
import { UpdateLibroReclamacionDto } from './dto/update-libro-reclamacion.dto';
import { FilterLibroReclamacionDto } from './dto/filter-libro-reclamacion.dto';
import { ResponderReclamoDto } from './dto/responder-reclamo.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CerrarReclamoDto } from './dto/cerrar-reclamo.dto';

@Controller('backend-api/libro-reclamaciones')
export class LibroReclamacionController {
  constructor(private readonly reclamacionService: LibroReclamacionService) {}

  // ========================================
  // IMPORTANTE: ORDEN CORRECTO DE RUTAS
  // Las rutas específicas (como 'estadisticas/general', 'consultar/:param')
  // DEBEN ir ANTES de las rutas genéricas con parámetros dinámicos (como ':id')
  // ========================================

  // ====== RUTAS ESPECÍFICAS ADMIN (PRIMERO) ======

  // Estadísticas generales
  @Get('estadisticas/general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async getEstadisticas() {
    const stats = await this.reclamacionService.getEstadisticas();
    return {
      success: true,
      data: stats,
    };
  }

  // ====== RUTAS PÚBLICAS (CLIENTE - SIN AUTENTICACIÓN) ======

  // Consultar reclamo por número
  @Get('consultar/:numeroReclamo')
  async consultarPorNumero(@Param('numeroReclamo') numeroReclamo: string) {
    const reclamo = await this.reclamacionService.findByNumero(numeroReclamo);
    return {
      success: true,
      data: reclamo,
    };
  }

  // Consultar reclamos por documento del cliente
  @Get('mis-reclamos/:numeroDocumento')
  async consultarPorDocumento(@Param('numeroDocumento') numeroDocumento: string) {
    const reclamos = await this.reclamacionService.findByDocumento(numeroDocumento);
    return {
      success: true,
      data: reclamos,
    };
  }

  // Descargar/Ver documento del reclamo
  @Get('documento/:documentoId')
  async descargarDocumento(
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const documentos = await this.reclamacionService.getDocumentos(documentoId);
    const documento = documentos[0];

    if (!documento || !existsSync(documento.ruta_archivo)) {
      throw new BadRequestException('Documento no encontrado');
    }

    const file = createReadStream(documento.ruta_archivo);
    
    res.set({
      'Content-Type': documento.tipo_mime,
      'Content-Disposition': `inline; filename="${documento.nombre_original}"`,
    });

    return new StreamableFile(file);
  }

  // ====== POST - CREAR RECLAMO (PÚBLICO) ======

  // Crear reclamo (con archivos adjuntos opcionales)
  @Post()
  @UseInterceptors(
    FilesInterceptor('archivos', 5, {
      storage: diskStorage({
        destination: './uploads/reclamos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `reclamo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async create(
    @Body() createDto: CreateLibroReclamacionDto,
    @UploadedFiles() archivos?: Express.Multer.File[],
  ) {
    const reclamo = await this.reclamacionService.create(createDto);

    if (archivos && archivos.length > 0) {
      for (const archivo of archivos) {
        await this.reclamacionService.saveDocumento(
          reclamo.id,
          archivo.filename,
          archivo.originalname,
          archivo.mimetype,
          archivo.size,
          archivo.path,
        );
      }
    }

    return {
      success: true,
      message: 'Reclamo registrado exitosamente',
      data: reclamo,
    };
  }

  // ====== RUTAS ADMIN CON PARÁMETROS GENÉRICOS (AL FINAL) ======

  // Listar todos los reclamos con filtros
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async findAll(@Query() filters: FilterLibroReclamacionDto) {
    const result = await this.reclamacionService.findAll(filters);
    return {
      success: true,
      ...result,
    };
  }

  // Obtener detalle de un reclamo
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const reclamo = await this.reclamacionService.findOne(id);
    return {
      success: true,
      data: reclamo,
    };
  }

  // Obtener documentos de un reclamo
  @Get(':id/documentos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async getDocumentos(@Param('id', ParseIntPipe) id: number) {
    const documentos = await this.reclamacionService.getDocumentos(id);
    return {
      success: true,
      data: documentos,
    };
  }

  // Actualizar reclamo
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLibroReclamacionDto,
  ) {
    const reclamo = await this.reclamacionService.update(id, updateDto);
    return {
      success: true,
      message: 'Reclamo actualizado exitosamente',
      data: reclamo,
    };
  }

  // Cambiar estado del reclamo
  @Put(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() cambiarEstadoDto: CambiarEstadoDto,
  ) {
    const reclamo = await this.reclamacionService.updateEstado(
      id,
      cambiarEstadoDto.estado,
      cambiarEstadoDto.usuarioId,
      cambiarEstadoDto.observacion,
    );
    return {
      success: true,
      message: 'Estado actualizado exitosamente',
      data: reclamo,
    };
  }

  // Cerrar reclamo
  @Put(':id/cerrar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() cerrarDto: CerrarReclamoDto,
  ) {
    const reclamo = await this.reclamacionService.cerrarReclamo(
      id,
      cerrarDto.usuarioId,
      cerrarDto.observacion,
    );
    return {
      success: true,
      message: 'Reclamo cerrado exitosamente',
      data: reclamo,
    };
  }

  // Responder reclamo
  @Post(':id/responder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() responderDto: ResponderReclamoDto,
  ) {
    const reclamo = await this.reclamacionService.responderReclamo(id, responderDto);
    return {
      success: true,
      message: 'Respuesta registrada exitosamente',
      data: reclamo,
    };
  }

  // Eliminar reclamo (soft delete)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.reclamacionService.remove(id);
    return {
      success: true,
      message: 'Reclamo eliminado exitosamente',
    };
  }

  // Eliminar documento
  @Delete('documento/:documentoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async removeDocumento(@Param('documentoId', ParseIntPipe) documentoId: number) {
    await this.reclamacionService.removeDocumento(documentoId);
    return {
      success: true,
      message: 'Documento eliminado exitosamente',
    };
  }
}