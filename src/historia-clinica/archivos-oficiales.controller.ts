// src/archivos/archivos-oficiales.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
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
import { MarcarEntregaArchivoOficialDto } from './dto/marcar-entrega-archivo-oficial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const getRol = (req: any): string => {
  const rol = req.user?.rol;
  return (typeof rol === 'string' ? rol : rol?.nombre || '').toLowerCase();
};

@Controller('backend_api/archivos-oficiales')
export class ArchivosOficialesController {
  constructor(private readonly archivosService: ArchivosOficialesService) {}

  @Post('subir')
  @UseGuards(JwtAuthGuard)
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
    const rolTrabajador = getRol(req);

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
  @UseGuards(JwtAuthGuard)
  async generarCodigoPreview(@Req() req: any) {
    const rolTrabajador = getRol(req);

    if (!['admin', 'admision'].includes(rolTrabajador)) {
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
  @UseGuards(JwtAuthGuard)
  async listarArchivos(
    @Query('pacienteId') pacienteId: number,
    @Query('trabajadorId') trabajadorId: number,
    @Req() req: any,
  ) {
    const rolTrabajador = getRol(req);

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
  @UseGuards(JwtAuthGuard)
  async descargarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = getRol(req);

    const { stream, mimetype, filename, fileSize } = await this.archivosService.obtenerArchivoStream(
      id,
      trabajadorId,
      rolTrabajador,
    );

    // ✅ Configurar headers para streaming
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': fileSize.toString(),
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // ✅ Hacer pipe del stream a la respuesta
    stream.pipe(res);

    // ✅ Manejar errores del stream
    stream.on('error', (error) => {
      console.error('Error streaming archivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al enviar el archivo' });
      }
    });
  }

  @Patch(':id/entrega')
  @UseGuards(JwtAuthGuard)
  async marcarEntrega(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarEntregaArchivoOficialDto,
    @Req() req: any,
  ) {
    const trabajadorId = req.user.id;
    const rolTrabajador = getRol(req);

    // Nombre directo del JWT — sin consulta extra a BD
    const usuarioLogueado = {
      id: req.user.id,
      nombres: req.user.nombres || '',
      apellidos: req.user.apellidos || '',
    };

    const archivo = await this.archivosService.marcarEntrega(id, dto.tipoEntrega, trabajadorId, rolTrabajador);

    const ahora = dto.tipoEntrega === 'digital' ? archivo.fechaEntregaDigital : archivo.fechaEntregaFisica;

    // Solo enviamos al frontend el campo que acaba de cambiar para no pisar el otro
    const campoActualizado = dto.tipoEntrega === 'digital'
      ? {
          entregaDigital: archivo.entregaDigital,
          fechaEntregaDigital: archivo.fechaEntregaDigital,
          entregadoDigitalPor: usuarioLogueado,
        }
      : {
          entregaFisica: archivo.entregaFisica,
          fechaEntregaFisica: archivo.fechaEntregaFisica,
          entregadoFisicoPor: usuarioLogueado,
        };

    return {
      success: true,
      message: `Entrega ${dto.tipoEntrega === 'fisico' ? 'física' : 'digital'} registrada`,
      data: { id: archivo.id, ...campoActualizado },
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async eliminarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const trabajadorId = req.user?.id || 1;
    const rolTrabajador = getRol(req);

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

  @Get('descargar-validado/:id')
  async descargarArchivoValidado(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { stream, mimetype, filename, fileSize } = await this.archivosService.obtenerArchivoStreamPublico(id);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileSize,
    });

    stream.pipe(res);
  }
}