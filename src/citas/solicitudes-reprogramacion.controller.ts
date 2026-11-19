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
  UseGuards,
} from '@nestjs/common';
import { SolicitudesReprogramacionService } from './solicitudes-reprogramacion.service';
import { CrearSolicitudReprogramacionDto } from './dto/crear-solicitud-reprogramacion.dto';
import { RevisarSolicitudReprogramacionDto } from './dto/revisar-solicitud-reprogramacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('backend_api/solicitudes-reprogramacion')
@UseGuards(JwtAuthGuard)
export class SolicitudesReprogramacionController {
  constructor(private readonly service: SolicitudesReprogramacionService) {}

  /** Admisión (o Admin) genera la solicitud. */
  @Post()
  crear(@Body() dto: CrearSolicitudReprogramacionDto) {
    return this.service.crear(dto);
  }

  /** Cantidad de pendientes (badge del menú). Solo Administrador. */
  @Get('pendientes/count')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  pendientesCount() {
    return this.service.pendientesCount();
  }

  /** Última solicitud de una cita (su estado/respuesta) — cualquier autenticado. */
  @Get('por-cita/:citaId')
  findUltimaPorCita(@Param('citaId', ParseIntPipe) citaId: number) {
    return this.service.findUltimaPorCita(citaId);
  }

  /** Listado admin. Filtro opcional ?estado=pendiente */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  findAll(@Query('estado') estado?: string) {
    return this.service.findAll(estado);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** Aprobar o rechazar (solo Administrador). Al aprobar se aplica el cambio. */
  @Patch(':id/revisar')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  revisar(@Param('id', ParseIntPipe) id: number, @Body() dto: RevisarSolicitudReprogramacionDto) {
    return this.service.revisar(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { message: 'Solicitud eliminada correctamente' };
  }
}
