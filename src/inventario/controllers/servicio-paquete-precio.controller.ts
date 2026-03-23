import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ServicioPaquetePrecioService } from '../services/servicio-paquete-precio.service';
import { CreateServicioPaquetePrecioDto } from '../dto/create-servicio-paquete-precio.dto';
import { UpdateServicioPaquetePrecioDto } from '../dto/update-servicio-paquete-precio.dto';

@Controller('backend_api/servicio-paquete-precio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicioPaquetePrecioController {
  constructor(private readonly servicioPaquetePrecioService: ServicioPaquetePrecioService) {}

  @Post()
  @Roles('Administrador')
  create(@Body() createDto: CreateServicioPaquetePrecioDto) {
    return this.servicioPaquetePrecioService.create(createDto);
  }

  @Get()
  @Roles('Administrador', 'Recepcionista', 'Profesional')
  findAll() {
    return this.servicioPaquetePrecioService.findAll();
  }

  @Get('servicio-tarifa/:servicioTarifaId')
  @Roles('Administrador', 'Recepcionista', 'Profesional')
  findByServicioTarifa(@Param('servicioTarifaId', ParseIntPipe) servicioTarifaId: number) {
    return this.servicioPaquetePrecioService.findByServicioTarifa(servicioTarifaId);
  }

  @Get(':id')
  @Roles('Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPaquetePrecioService.findOne(id);
  }

  @Put(':id')
  @Roles('Administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateServicioPaquetePrecioDto) {
    return this.servicioPaquetePrecioService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('Administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPaquetePrecioService.remove(id);
  }
}
