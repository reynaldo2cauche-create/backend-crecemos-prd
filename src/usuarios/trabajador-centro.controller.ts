import { Controller, Get, Post, Body, Patch, Param, Put, UseGuards, Request, Delete, Query } from '@nestjs/common';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('backend_api/trabajadores')
export class TrabajadorCentroController {
  constructor(private readonly service: TrabajadorCentroService) {}

  // ============== ENDPOINTS ORIGINALES ==============
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('select')
  findAllForSelect() {
    return this.service.findAllForSelect();
  }

  // ============== ENDPOINTS RRHH ==============
  @Get('empleados')
  @UseGuards(JwtAuthGuard)
  findAllEmpleados(@Query('estado') estado?: string) {
    return this.service.findAllForRRHH(estado);
  }

  @Get('empleados/:id')
  @UseGuards(JwtAuthGuard)
  findOneEmpleado(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post('empleados')
  @UseGuards(JwtAuthGuard)
  createEmpleado(@Body() dto: CreateTrabajadorCentroDto) {
    return this.service.create(dto);
  }

  @Put('empleados/:id')
  @UseGuards(JwtAuthGuard)
  updateEmpleado(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    return this.service.update(+id, dto);
  }

  @Delete('empleados/:id')
  @UseGuards(JwtAuthGuard)
  deleteEmpleado(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Get('perfil/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    console.log('🔍 req.user:', req.user);
    console.log('🆔 User ID:', req.user.id);
    return this.service.findOneById(req.user.id);
  }

  @Patch('perfil/me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('🔍 Actualizando perfil de usuario ID:', req.user.id);
    return this.service.update(req.user.id, dto);
  }

  @Get('perfil/me/campos-bloqueados')
  @UseGuards(JwtAuthGuard)
  async getMisCamposBloqueados(@Request() req) {
    return this.service.getCamposBloqueados(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post()
  create(@Body() dto: CreateTrabajadorCentroDto) {
    console.log('============ CONTROLLER POST ============');
    console.log('Body recibido en controller:', dto);
    console.log('correo_corporativo recibido:', dto.correo_corporativo);
    console.log('========================================');
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('============ CONTROLLER PATCH ============');
    console.log('ID recibido:', id);
    console.log('DTO recibido:', JSON.stringify(dto, null, 2));
    console.log('correo_corporativo recibido:', dto.correo_corporativo);
    console.log('==========================================');
    return this.service.update(+id, dto);
  }

  @Put(':id/activar')
  activar(@Param('id') id: string) {
    return this.service.setEstado(+id, true);
  }

  @Put(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.service.setEstado(+id, false);
  }
} 