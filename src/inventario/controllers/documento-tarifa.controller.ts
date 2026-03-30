import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DocumentoTarifaService } from '../services/documento-tarifa.service';
import { CreateDocumentoTarifaDto } from '../dto/create-documento-tarifa.dto';
import { UpdateDocumentoTarifaDto } from '../dto/update-documento-tarifa.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('backend_api/inventario/documentos-tarifa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentoTarifaController {
  constructor(private readonly documentoTarifaService: DocumentoTarifaService) {}

  @Get()
  // Sin @Roles - cualquier usuario autenticado puede ver documentos activos para vender
  findAll() {
    return this.documentoTarifaService.findAll();
  }

  @Get('all-including-inactive')
  @Roles('ADMIN')
  findAllIncludingInactive() {
    return this.documentoTarifaService.findAllIncludingInactive();
  }

  @Get(':id')
  // Sin @Roles - cualquier usuario autenticado puede ver un documento específico
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentoTarifaService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateDocumentoTarifaDto) {
    return this.documentoTarifaService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentoTarifaDto) {
    return this.documentoTarifaService.update(id, dto);
  }

  @Patch(':id/desactivar')
  @Roles('ADMIN')
  desactivar(@Param('id', ParseIntPipe) id: number, @Body('user_actua_id') userActuaId?: number) {
    return this.documentoTarifaService.desactivar(id, userActuaId);
  }

  @Patch(':id/activar')
  @Roles('ADMIN')
  activar(@Param('id', ParseIntPipe) id: number, @Body('user_actua_id') userActuaId?: number) {
    return this.documentoTarifaService.activar(id, userActuaId);
  }
}
