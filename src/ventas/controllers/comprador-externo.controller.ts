import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompradorExternoService } from '../services/comprador-externo.service';
import { CreateCompradorExternoDto } from '../dto/create-comprador-externo.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/ventas/compradores-externos')
@UseGuards(JwtAuthGuard)
export class CompradorExternoController {
  constructor(private readonly service: CompradorExternoService) {}

  @Get()
  findAll(@Query('todos') todos?: string) {
    return this.service.findAll(todos !== 'true');
  }

  @Get('buscar')
  buscar(@Query('q') q: string) {
    return this.service.buscar(q || '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'VENTAS', accion: 'CREAR_COMPRADOR_EXTERNO' })
  create(@Body() dto: CreateCompradorExternoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Auditable({ modulo: 'VENTAS', accion: 'EDITAR_COMPRADOR_EXTERNO' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCompradorExternoDto> & { user_actua_id?: number }) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/desactivar')
  @Auditable({ modulo: 'VENTAS', accion: 'DESACTIVAR_COMPRADOR_EXTERNO' })
  desactivar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.desactivar(+id, body.user_id);
  }
}
