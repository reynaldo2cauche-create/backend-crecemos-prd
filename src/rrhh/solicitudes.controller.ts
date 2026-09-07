import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';

@Controller('backend_api/solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  /** Subir el documento adjunto; devuelve la URL para usar en `archivoUrl`. */
  @Post('adjunto')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/solicitudes',
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `solicitud-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  subirAdjunto(@UploadedFile() archivo: Express.Multer.File) {
    return { url: `/uploads/solicitudes/${archivo.filename}`, nombre: archivo.originalname };
  }

  /** Resumen mensual (4 indicadores). Sin trabajadorId = vista admin (todos). */
  @Get('resumen')
  resumen(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('trabajadorId') trabajadorId?: string,
  ) {
    const ahora = new Date();
    return this.solicitudesService.resumen(
      mes ? parseInt(mes) : ahora.getMonth() + 1,
      anio ? parseInt(anio) : ahora.getFullYear(),
      trabajadorId ? parseInt(trabajadorId) : undefined,
    );
  }

  /** Solicitudes de un trabajador (autoservicio). */
  @Get('mias')
  findMias(@Query('trabajadorId', ParseIntPipe) trabajadorId: number, @Query('estado') estado?: string) {
    return this.solicitudesService.findByTrabajador(trabajadorId, estado);
  }

  @Post()
  crear(@Body() dto: CrearSolicitudDto) {
    return this.solicitudesService.crear(dto);
  }

  /** Listado admin. Filtro opcional ?estado=pendiente */
  @Get()
  findAll(@Query('estado') estado?: string) {
    return this.solicitudesService.findAll(estado);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.solicitudesService.findOne(id);
  }

  /** Aprobar o rechazar (RRHH). */
  @Patch(':id/revisar')
  revisar(@Param('id', ParseIntPipe) id: number, @Body() dto: RevisarSolicitudDto) {
    return this.solicitudesService.revisar(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.solicitudesService.remove(id);
    return { message: 'Solicitud eliminada correctamente' };
  }
}
