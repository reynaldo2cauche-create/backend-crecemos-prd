import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

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

  // ─── Mover columna ──────────────────────────────────────────────────────────

  @Patch(':id/columna')
  moverColumna(
    @Param('id', ParseIntPipe) id: number,
    @Body('columna_id') columnaId: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.tareasService.moverColumna(id, Number(columnaId), userId);
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  @Patch(':id/timer/iniciar')
  iniciarTimer(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.iniciarTimer(id);
  }

  @Patch(':id/timer/pausar')
  pausarTimer(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.pausarTimer(id);
  }

  // ─── Comentarios ────────────────────────────────────────────────────────────

  @Get(':id/comentarios')
  listarComentarios(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.listarComentarios(id);
  }

  @Post(':id/comentarios')
  agregarComentario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateComentarioDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.tareasService.agregarComentario(id, dto, userId);
  }
}
