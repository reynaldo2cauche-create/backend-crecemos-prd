import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PlanificadorService } from './planificador.service';

@Controller('backend_api/planificador')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador', 'Terapeuta')
export class PlanificadorController {
  constructor(private readonly service: PlanificadorService) {}

  /** Servicios de terapia del paciente que el usuario puede planificar. */
  @Get('servicios/:pacienteId')
  listarServicios(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Req() req: any,
  ) {
    return this.service.listarServicios(pacienteId, req.user);
  }

  /** Plan de un servicio (línea de tiempo de sesiones + bloques + objetivos + registros). */
  @Get('plan/:pacienteId/:servicioId')
  obtenerPlan(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @Req() req: any,
  ) {
    return this.service.obtenerPlan(pacienteId, servicioId, req.user);
  }

  @Post('objetivo')
  agregarObjetivo(@Body() body: any, @Req() req: any) {
    return this.service.agregarObjetivo(body, req.user);
  }

  @Patch('objetivo/:id')
  editarObjetivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.editarObjetivo(id, body, req.user);
  }

  @Delete('objetivo/:id')
  eliminarObjetivo(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.eliminarObjetivo(id, req.user);
  }

  /** Registrar/actualizar el resultado de un objetivo en una sesión. */
  @Put('registro')
  guardarRegistro(@Body() body: any, @Req() req: any) {
    return this.service.guardarRegistro(body, req.user);
  }
}
