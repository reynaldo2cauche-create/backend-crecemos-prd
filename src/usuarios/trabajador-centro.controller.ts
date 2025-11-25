import { Controller, Get, Post, Body, Patch, Param, Put, UseGuards, Request, Delete, Query } from '@nestjs/common';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class TrabajadorCentroController {
  constructor(private readonly service: TrabajadorCentroService) {}

  // ============== ENDPOINTS ORIGINALES ==============
  @Get('backend_api/trabajadores')
  findAll() {
    return this.service.findAll();
  }

  @Get('backend_api/trabajadores/select')
  findAllForSelect() {
    return this.service.findAllForSelect();
  }

  // ============== ENDPOINTS RRHH ==============
  @Get('api/empleados')
  @UseGuards(JwtAuthGuard)
  findAllEmpleados(@Query('estado') estado?: string) {
    return this.service.findAllForRRHH(estado);
  }

  @Get('api/empleados/:id')
  @UseGuards(JwtAuthGuard)
  findOneEmpleado(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post('api/empleados')
  @UseGuards(JwtAuthGuard)
  createEmpleado(@Body() dto: CreateTrabajadorCentroDto) {
    return this.service.create(dto);
  }

  @Put('api/empleados/:id')
  @UseGuards(JwtAuthGuard)
  updateEmpleado(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    return this.service.update(+id, dto);
  }

  @Delete('api/empleados/:id')
  @UseGuards(JwtAuthGuard)
  deleteEmpleado(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Get('backend_api/trabajadores/perfil/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    console.log('🔍 req.user:', req.user);
    console.log('🆔 User ID:', req.user.id);
    return this.service.findOneById(req.user.id);
  }

  @Patch('backend_api/trabajadores/perfil/me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('🔍 Actualizando perfil de usuario ID:', req.user.id);
    return this.service.update(req.user.id, dto);
  }

  @Get('backend_api/trabajadores/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post('backend_api/trabajadores')
  create(@Body() dto: CreateTrabajadorCentroDto) {
    console.log('Body recibido en controller:', dto);
    return this.service.create(dto);
  }

  @Patch('backend_api/trabajadores/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('============ CONTROLLER PATCH ============');
    console.log('ID recibido:', id);
    console.log('DTO recibido:', JSON.stringify(dto, null, 2));
    console.log('==========================================');
    return this.service.update(+id, dto);
  }

  @Put('backend_api/trabajadores/:id/activar')
  activar(@Param('id') id: string) {
    return this.service.setEstado(+id, true);
  }

  @Put('backend_api/trabajadores/:id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.service.setEstado(+id, false);
  }
} 