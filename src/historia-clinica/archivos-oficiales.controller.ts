// src/archivos/archivos-oficiales.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
  ParseIntPipe,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ArchivosOficialesService } from './archivos-oficiales.service';
import { CrearArchivoOficialDto } from './dto/crear-archivo-oficial.dto';
import { ValidarDocumentoDto } from './dto/validar-documento.dto';

@Controller('backend_api/archivos-oficiales')
export class ArchivosOficialesController {
  constructor(private readonly archivosService: ArchivosOficialesService) {}

  @Post('subir')
  @UseInterceptors(FileInterceptor('archivo', {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }))
  async subirArchivo(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CrearArchivoOficialDto,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    if (!file) {
      return { error: 'Debe seleccionar un archivo' };
    }

    const archivo = await this.archivosService.subirArchivo(
      file,
      dto,
      trabajadorId,
      rolTrabajador,
    );

    return {
      success: true,
      message: 'Archivo subido correctamente',
      data: {
        id: archivo.id,
        codigoValidacion: archivo.codigoValidacion,
        nombreArchivo: archivo.nombreOriginal,
        fechaEmision: archivo.fechaEmision,
      },
    };
  }

  @Get('generar-codigo')
  async generarCodigoPreview(@Req() req: any) {
    const rolTrabajador = req.user?.rol || 'admin';
    
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('No tienes permisos');
    }

    const codigo = await this.archivosService.generarCodigoPreview();

    return {
      success: true,
      data: {
        codigo,
        mensaje: 'Código generado. Añádalo al documento antes de subirlo.',
      },
    };
  }

  @Get()
  async listarArchivos(
    @Query('pacienteId') pacienteId: number,
    @Query('trabajadorId') trabajadorId: number,
    @Req() req: any,
  ) {
    const rolTrabajador = req.user?.rol || 'admin';

    const archivos = await this.archivosService.listarArchivos(
      rolTrabajador,
      pacienteId,
      trabajadorId,
    );

    return {
      success: true,
      data: archivos,
    };
  }

  @Get(':id/descargar')
  async descargarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    const { buffer, mimetype, filename } = await this.archivosService.obtenerArchivo(
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

  @Delete(':id')
  async eliminarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = req.user?.rol || 'admin';

    await this.archivosService.eliminarArchivo(id, trabajadorId, rolTrabajador);

    return {
      success: true,
      message: 'Archivo eliminado correctamente',
    };
  }

  @Post('validar')
  async validarDocumento(@Body() dto: ValidarDocumentoDto) {
    const resultado = await this.archivosService.validarDocumento(dto.codigo);

    return {
      success: true,
      data: resultado,
    };
  }

  @Get('validar/:codigo')
  async validarDocumentoPorUrl(@Param('codigo') codigo: string) {
    const resultado = await this.archivosService.validarDocumento(codigo);

    return {
      success: true,
      data: resultado,
    };
  }
}