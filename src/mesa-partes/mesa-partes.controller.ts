import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, createReadStream } from 'fs';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// En este sistema la "recepción" es el rol Admisión.
import { MesaPartesService } from './mesa-partes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ResponderSolicitudDto } from './dto/responder-solicitud.dto';
import { AccionSolicitudDto } from './dto/accion-solicitud.dto';
import { FiltrarSolicitudesDto } from './dto/filtrar-solicitudes.dto';

// Configuración de almacenamiento de archivos (documento físico y respuestas)
const storageMesaPartes = diskStorage({
  destination: './uploads/mesa-partes',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `mp-${uniqueSuffix}${ext}`);
  },
});

const fileFilterMesaPartes = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido'), false);
};

// Convierte la ruta física de multer en ruta relativa servible por /uploads
const rutaRelativa = (p: string) => p.replace(/^uploads[\\/]/, '').replace(/\\/g, '/');

@Controller('backend_api/mesa-partes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MesaPartesController {
  constructor(private readonly service: MesaPartesService) {}

  // ---------------- Catálogos ----------------
  @Get('catalogos')
  @Roles('Administrador', 'Admisión')
  async catalogos() {
    const data = await this.service.obtenerCatalogos();
    return { success: true, data };
  }

  @Get('estadisticas')
  @Roles('Administrador', 'Admisión')
  async estadisticas() {
    const data = await this.service.obtenerEstadisticas();
    return { success: true, data };
  }

  // ---------------- Bandeja / listado ----------------
  @Get()
  @Roles('Administrador', 'Admisión')
  async listar(@Query() filtros: FiltrarSolicitudesDto) {
    const result = await this.service.listar(filtros);
    return { success: true, ...result };
  }

  // ---------------- Servir adjunto (protegido) ----------------
  // En producción /uploads no llega al backend; por eso se sirve por aquí.
  @Get('archivo/:filename')
  @Roles('Administrador', 'Admisión')
  async getArchivo(@Param('filename') filename: string, @Res() res: Response) {
    const limpio = basename(filename); // evita path traversal
    const ruta = join(process.cwd(), 'uploads', 'mesa-partes', limpio);
    if (!existsSync(ruta)) throw new BadRequestException('Archivo no encontrado');

    const ext = extname(limpio).toLowerCase();
    const mimes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
    };
    res.setHeader('Content-Type', mimes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(ruta).pipe(res);
  }

  // ---------------- Buscar pacientes (sin geofencing) ----------------
  @Get('pacientes/buscar')
  @Roles('Administrador', 'Admisión')
  async buscarPacientes(@Query('q') q: string) {
    const data = await this.service.buscarPacientes(q);
    return { success: true, data };
  }

  // ---------------- Detalle del expediente ----------------
  @Get(':id')
  @Roles('Administrador', 'Admisión')
  async detalle(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.obtenerPorId(id);
    return { success: true, data };
  }

  // ---------------- Registrar solicitud (RECEPCIÓN) ----------------
  @Post()
  @Roles('Administrador', 'Admisión')
  @UseInterceptors(
    FilesInterceptor('archivos', 5, {
      storage: storageMesaPartes,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: fileFilterMesaPartes,
    }),
  )
  async crear(
    @Body() dto: CrearSolicitudDto,
    @UploadedFiles() archivos?: Express.Multer.File[],
  ) {
    const solicitud = await this.service.crearSolicitud(dto);

    if (archivos && archivos.length > 0) {
      for (const archivo of archivos) {
        await this.service.guardarAdjunto({
          solicitudId: solicitud.id,
          nombreArchivo: archivo.originalname,
          ruta: rutaRelativa(archivo.path),
          tipoMime: archivo.mimetype,
          tamano: archivo.size,
          usuarioId: dto.user_crea_id,
        });
      }
    }

    const data = await this.service.obtenerPorId(solicitud.id);
    return { success: true, message: 'Solicitud registrada', data };
  }

  // ---------------- Responder (ADMIN): atender / rechazar ----------------
  @Put(':id/responder')
  @Roles('Administrador')
  @UseInterceptors(
    FilesInterceptor('archivos', 5, {
      storage: storageMesaPartes,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: fileFilterMesaPartes,
    }),
  )
  async responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderSolicitudDto,
    @UploadedFiles() archivos?: Express.Multer.File[],
  ) {
    const data = await this.service.responder(id, dto);

    if (archivos && archivos.length > 0) {
      // Vincular los archivos de respuesta al último evento registrado
      const ultimoEvento = data.eventos?.[data.eventos.length - 1];
      for (const archivo of archivos) {
        await this.service.guardarAdjunto({
          solicitudId: id,
          eventoId: ultimoEvento?.id ?? null,
          nombreArchivo: archivo.originalname,
          ruta: rutaRelativa(archivo.path),
          tipoMime: archivo.mimetype,
          tamano: archivo.size,
          usuarioId: dto.usuario_id,
        });
      }
    }

    const actualizada = await this.service.obtenerPorId(id);
    return { success: true, message: 'Respuesta registrada', data: actualizada };
  }

  // ---------------- Observar (ADMIN) ----------------
  @Put(':id/observar')
  @Roles('Administrador')
  async observar(@Param('id', ParseIntPipe) id: number, @Body() dto: AccionSolicitudDto) {
    const data = await this.service.observar(id, dto);
    return { success: true, message: 'Solicitud observada', data };
  }

  // ---------------- Notificar al apoderado (RECEPCIÓN) ----------------
  @Put(':id/notificar')
  @Roles('Administrador', 'Admisión')
  async notificar(@Param('id', ParseIntPipe) id: number, @Body() dto: AccionSolicitudDto) {
    const data = await this.service.notificar(id, dto);
    return { success: true, message: 'Apoderado notificado', data };
  }

  // ---------------- Entregar / cerrar (RECEPCIÓN) ----------------
  @Put(':id/entregar')
  @Roles('Administrador', 'Admisión')
  async entregar(@Param('id', ParseIntPipe) id: number, @Body() dto: AccionSolicitudDto) {
    const data = await this.service.entregar(id, dto);
    return { success: true, message: 'Expediente cerrado', data };
  }

  // ---------------- Comentario interno ----------------
  @Put(':id/comentar')
  @Roles('Administrador', 'Admisión')
  async comentar(@Param('id', ParseIntPipe) id: number, @Body() dto: AccionSolicitudDto) {
    const data = await this.service.comentar(id, dto);
    return { success: true, message: 'Comentario agregado', data };
  }
}
