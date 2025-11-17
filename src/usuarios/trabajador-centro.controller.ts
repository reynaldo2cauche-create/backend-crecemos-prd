import { Controller, Get, Post, Body, Patch, Param, Put, UseGuards, Request } from '@nestjs/common';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('backend_api/trabajadores')
export class TrabajadorCentroController {
  constructor(private readonly service: TrabajadorCentroService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('select')
  findAllForSelect() {
    return this.service.findAllForSelect();
  }

  @Get('perfil/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    return this.service.findOneById(req.user.userId);
  }

  @Patch('perfil/me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req, @Body() dto: UpdateTrabajadorCentroDto) {
    return this.service.update(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post()
  create(@Body() dto: CreateTrabajadorCentroDto) {
    console.log('Body recibido en controller:', dto);
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('============ CONTROLLER PATCH ============');
    console.log('ID recibido:', id);
    console.log('DTO recibido:', JSON.stringify(dto, null, 2));
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