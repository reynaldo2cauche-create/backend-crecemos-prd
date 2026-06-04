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
import { PlanTerapeuticoService } from './plan-terapeutico.service';

@Controller('backend_api/plan-terapeutico')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador', 'Terapeuta')
export class PlanTerapeuticoController {
  constructor(private readonly service: PlanTerapeuticoService) {}

  /** Servicios de terapia del paciente que el usuario puede planificar. */
  @Get('servicios/:pacienteId')
  listarServicios(@Param('pacienteId', ParseIntPipe) pacienteId: number, @Req() req: any) {
    return this.service.listarServicios(pacienteId, req.user);
  }

  /** Áreas de trabajo del catálogo para un servicio. */
  @Get('areas/:servicioId')
  listarAreas(@Param('servicioId', ParseIntPipe) servicioId: number) {
    return this.service.listarAreas(servicioId);
  }

  /** Plan completo: sesiones + generales → específicos → registros + progresos. */
  @Get('plan/:pacienteId/:servicioId')
  obtenerPlan(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @Req() req: any,
  ) {
    return this.service.obtenerPlan(pacienteId, servicioId, req.user);
  }

  @Patch('plan/:id')
  actualizarPlan(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.service.actualizarPlan(id, body, req.user);
  }

  // ── Objetivos generales ──
  @Post('general')
  crearGeneral(@Body() body: any, @Req() req: any) {
    return this.service.crearGeneral(body, req.user);
  }

  @Patch('general/:id')
  editarGeneral(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.service.editarGeneral(id, body, req.user);
  }

  @Delete('general/:id')
  eliminarGeneral(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.eliminarGeneral(id, req.user);
  }

  // ── Objetivos específicos ──
  @Post('especifico')
  crearEspecifico(@Body() body: any, @Req() req: any) {
    return this.service.crearEspecifico(body, req.user);
  }

  @Patch('especifico/:id')
  editarEspecifico(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.service.editarEspecifico(id, body, req.user);
  }

  @Delete('especifico/:id')
  eliminarEspecifico(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.eliminarEspecifico(id, req.user);
  }

  /** Registrar/actualizar el resultado de un objetivo específico en una sesión. */
  @Put('registro')
  guardarRegistro(@Body() body: any, @Req() req: any) {
    return this.service.guardarRegistro(body, req.user);
  }

  // ── Asignación de objetivos por bloque de 4 sesiones ──
  @Post('asignacion-bloque')
  asignarBloque(@Body() body: any, @Req() req: any) {
    return this.service.asignarObjetivoBloque(body, req.user);
  }

  @Delete('asignacion-bloque/:especificoId/:numeroBloque')
  desasignarBloque(
    @Param('especificoId', ParseIntPipe) especificoId: number,
    @Param('numeroBloque', ParseIntPipe) numeroBloque: number,
    @Req() req: any,
  ) {
    return this.service.desasignarObjetivoBloque(especificoId, numeroBloque, req.user);
  }
}
