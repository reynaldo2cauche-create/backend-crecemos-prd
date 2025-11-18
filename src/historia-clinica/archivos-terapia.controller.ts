// ============================================
// src/archivos/archivos-terapia.controller.ts
// ============================================
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ArchivosTerapiaService } from './archivos-terapia.service';
import { CrearArchivoTerapiaDto } from './dto/crear-archivo-terapia.dto';
import { IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// DTO inline
class CambiarVisibilidadDto {
  @IsInt({ message: 'esCompartido debe ser 0 o 1' })
  @IsIn([0, 1], { message: 'esCompartido debe ser 0 (privado) o 1 (compartido)' })
  @Type(() => Number)
  esCompartido: number;
}

@Controller('backend_api/archivos-terapia')
export class ArchivosTerapiaController {
  constructor(private readonly archivosTerapiaService: ArchivosTerapiaService) {}

  // ============================================
  // SUBIR ARCHIVO
  // ============================================
  @Post('subir')
  @UseInterceptors(FileInterceptor('archivo', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
  }))
  async subirArchivo(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CrearArchivoTerapiaDto,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    // Validar que sea admin, admision o terapeuta
    const rolesPermitidos = ['admin', 'admision', 'terapeuta'];
    if (!rolesPermitidos.includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('No tienes permisos para subir archivos');
    }

    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    const archivo = await this.archivosTerapiaService.subirArchivo(
      file,
      dto,
      trabajadorId,
      rolTrabajador,
    );

    return {
      success: true,
      message: 'Archivo subido correctamente',
      data: archivo,
    };
  }

  // ============================================
  // LISTAR ARCHIVOS
  // ============================================
  @Get()
  async listarArchivos(
    @Query('pacienteId') pacienteId: number,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    const rolesPermitidos = ['admin', 'admision', 'terapeuta'];
    if (!rolesPermitidos.includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('No tienes permisos para ver archivos');
    }

    const archivos = await this.archivosTerapiaService.listarArchivos(
      trabajadorId,
      rolTrabajador,
      pacienteId,
    );

    return {
      success: true,
      data: archivos,
    };
  }

  // ============================================
  // DESCARGAR ARCHIVO
  // ============================================
  @Get(':id/descargar')
  async descargarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    const rolesPermitidos = ['admin', 'admision', 'terapeuta'];
    if (!rolesPermitidos.includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('No tienes permisos para descargar archivos');
    }

    const { buffer, mimetype, filename } = await this.archivosTerapiaService.obtenerArchivo(
      id,
      trabajadorId,
      rolTrabajador,
    );

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(buffer);
  }

  // ============================================
  // VER ARCHIVO (en el navegador)
  // ============================================
  @Get(':id/ver')
  async verArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    const rolesPermitidos = ['admin', 'admision', 'terapeuta'];
    if (!rolesPermitidos.includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('No tienes permisos para ver archivos');
    }

    const { buffer, mimetype, filename } = await this.archivosTerapiaService.obtenerArchivo(
      id,
      trabajadorId,
      rolTrabajador,
    );

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    res.send(buffer);
  }

  // ============================================
  // ELIMINAR ARCHIVO (Soft delete)
  // ============================================
  @Delete(':id')
  async eliminarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    const rolesPermitidos = ['admin', 'admision', 'terapeuta'];
    if (!rolesPermitidos.includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('No tienes permisos para eliminar archivos');
    }

    await this.archivosTerapiaService.eliminarArchivo(id, trabajadorId, rolTrabajador);

    return {
      success: true,
      message: 'Archivo eliminado correctamente',
    };
  }

  // ============================================
  // CAMBIAR VISIBILIDAD
  // ============================================
  @Patch(':id/visibilidad')
  async cambiarVisibilidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarVisibilidadDto,
    @Req() req: any,
  ) {
    const rolTrabajador = req.user?.rol || 'admin';

    // Solo admin y admisión pueden cambiar visibilidad
    if (!['admin', 'admision'].includes(rolTrabajador?.toLowerCase())) {
      throw new BadRequestException('Solo admin y admisión pueden cambiar la visibilidad');
    }

    const archivo = await this.archivosTerapiaService.cambiarVisibilidad(
      id,
      dto.esCompartido,
      rolTrabajador,
    );

    return {
      success: true,
      message: 'Visibilidad actualizada correctamente',
      data: archivo,
    };
  }
}