import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Request, UseGuards, ParseIntPipe, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TareasService } from './tareas.service';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

import { Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('backend_api/tareas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  // ─── Catálogos ──────────────────────────────────────────────────────────────

  @Get('prioridades')
  listarPrioridades() {
    return this.tareasService.listarPrioridades();
  }

  @Get('columnas')
  listarColumnas() {
    return this.tareasService.listarColumnas();
  }

  @Post('columnas')
  crearColumna(@Body() body: { nombre: string; color: string; es_final: boolean }, @Request() req) {
    return this.tareasService.crearColumna(body, req.user?.id);
  }

  @Patch('columnas/reordenar')
  reordenarColumnas(@Body() body: { ids: number[] }, @Request() req) {
    return this.tareasService.reordenarColumnas(body.ids, req.user?.id);
  }

  @Delete('columnas/:id')
  eliminarColumna(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.eliminarColumna(id);
  }

  // ─── Reporte ────────────────────────────────────────────────────────────────

  @Get('reporte/mensual')
  reporteMensual(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.tareasService.reporteMensual(mes, anio);
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  @Get()
  listar(@Request() req) {
    const userId = req.user?.id;
    const rolId = req.user?.rol?.id ?? req.user?.rol_id;
    return this.tareasService.listar(userId, rolId);
  }


    @Public()
      @Get('archivos/file/:filename')
      verArchivo(@Param('filename') filename: string, @Res() res: Response) {
        const rutaArchivo = path.join(process.cwd(), 'uploads', 'tareas', filename);
        if (!fs.existsSync(rutaArchivo)) {
          return res.status(404).json({ message: 'Archivo no encontrado' });
        }
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
          '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        fs.createReadStream(rutaArchivo).pipe(res);
      }

  // ─── Archivadas ─────────────────────────────────────────────────────────────

  @Get('archivadas')
  listarArchivadas(
    @Query('busqueda') busqueda?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('prioridad_id') prioridad_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tareasService.listarArchivadas({
      busqueda,
      desde,
      hasta,
      prioridad_id: prioridad_id ? parseInt(prioridad_id) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.restaurar(id);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.obtenerPorId(id);
  }

  @Post()
  crear(@Body() dto: CreateTareaDto, @Request() req) {
    const userId = req.user?.id;
    return this.tareasService.crear(dto, userId);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTareaDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.tareasService.actualizar(id, dto, userId);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.eliminar(id);
  }

  // ─── Reordenar tareas ───────────────────────────────────────────────────────

  @Patch('reordenar')
  reordenarTareas(@Body() body: { ids: number[] }, @Request() req) {
    return this.tareasService.reordenarTareas(body.ids, req.user?.id);
  }

  // ─── Mover columna ──────────────────────────────────────────────────────────

  @Patch(':id/columna')
  moverColumna(
    @Param('id', ParseIntPipe) id: number,
    @Body('columna_id') columnaId: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    const rolId = req.user?.rol?.id ?? req.user?.rol_id;
    return this.tareasService.moverColumna(id, Number(columnaId), userId, rolId);
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  @Patch(':id/timer/iniciar')
  iniciarTimer(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.tareasService.iniciarTimer(id, req.user?.id, req.user?.rol_id);
  }

  @Patch(':id/timer/pausar')
  pausarTimer(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.tareasService.pausarTimer(id, req.user?.id, req.user?.rol_id);
  }

  // ─── Comentarios ────────────────────────────────────────────────────────────

  @Get(':id/comentarios')
  listarComentarios(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.listarComentarios(id);
  }

  @Delete('comentarios/:comentarioId')
  eliminarComentario(
    @Param('comentarioId', ParseIntPipe) comentarioId: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    const esAdmin = req.user?.rol?.id === 1 || req.user?.rol_id === 1;
    return this.tareasService.eliminarComentario(comentarioId, userId, esAdmin);
  }

  @Post(':id/comentarios')
  @UseInterceptors(FilesInterceptor('archivos', 10, {
    storage: diskStorage({
      destination: './uploads/tareas',
      filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `comentario-${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  agregarComentario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateComentarioDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const userId = req.user?.id;
    console.log('[comentario] files recibidos:', files?.length, files?.map(f => ({ name: f.originalname, size: f.size, mime: f.mimetype })));
    console.log('[comentario] content-type:', req.headers['content-type']);
    return this.tareasService.agregarComentario(id, dto, userId, files);
  }

  // ─── Archivos ────────────────────────────────────────────────────────────────

  @Get(':id/archivos')
  listarArchivos(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.listarArchivos(id);
  }

  @Post(':id/archivos')
  @UseInterceptors(FilesInterceptor('archivos', 10, {
    storage: diskStorage({
      destination: './uploads/tareas',
      filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `tarea-${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async subirArchivos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const userId = req.user?.id;
    return Promise.all(files.map(f => this.tareasService.guardarArchivo(id, f, userId)));
  }

  @Delete(':id/archivos/:archivoId')
  eliminarArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
  ) {
    return this.tareasService.eliminarArchivo(archivoId);
  }


}
