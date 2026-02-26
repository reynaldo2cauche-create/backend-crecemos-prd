import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromocionService } from '../services/promocion.service';
import { AplicadorPromocionService } from '../services/aplicador-promocion.service';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';
import { AplicarPromocionDto } from '../dto/aplicar-promocion.dto';

@Controller('backend_api/promociones')
@UseGuards(JwtAuthGuard)
export class PromocionController {
  constructor(
    private readonly promocionService: PromocionService,
    private readonly aplicadorService: AplicadorPromocionService,
  ) {}

  /**
   * GET /backend_api/promociones
   * Listar todas las promociones con filtros opcionales
   */
  @Get()
  findAll(
    @Query('soloActivas') soloActivas?: string,
    @Query('soloVigentes') soloVigentes?: string,
  ) {
    return this.promocionService.findAll({
      soloActivas: soloActivas === 'true',
      soloVigentes: soloVigentes === 'true',
    });
  }

  /**
   * GET /backend_api/promociones/vigentes
   * Obtener promociones activas y vigentes
   */
  @Get('vigentes')
  getVigentes(@Query('fecha') fecha?: string) {
    const fechaConsulta = fecha ? new Date(fecha) : undefined;
    return this.promocionService.getPromocionesVigentes(fechaConsulta);
  }

  /**
   * GET /backend_api/promociones/:id
   * Obtener una promoción por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promocionService.findOne(id);
  }

  /**
   * POST /backend_api/promociones
   * Crear nueva promoción
   */
  @Post()
  create(@Body() createDto: CreatePromocionDto) {
    return this.promocionService.create(createDto);
  }

  /**
   * PUT /backend_api/promociones/:id
   * Actualizar promoción completa
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePromocionDto,
  ) {
    return this.promocionService.update(id, updateDto);
  }

  /**
   * PATCH /backend_api/promociones/:id/activar
   * Activar promoción
   */
  @Patch(':id/activar')
  activar(
    @Param('id', ParseIntPipe) id: number,
    @Body('user_id') userId?: number,
  ) {
    return this.promocionService.toggleActivo(id, true, userId);
  }

  /**
   * PATCH /backend_api/promociones/:id/desactivar
   * Desactivar promoción
   */
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @Body('user_id') userId?: number,
  ) {
    return this.promocionService.toggleActivo(id, false, userId);
  }

  /**
   * DELETE /backend_api/promociones/:id
   * Eliminar promoción
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promocionService.remove(id);
  }

  /**
   * POST /backend_api/promociones/calcular
   * Calcular promociones aplicables a un carrito
   */
  @Post('calcular')
  calcular(@Body() dto: AplicarPromocionDto) {
    return this.aplicadorService.calcularPromociones(dto);
  }

  /**
   * POST /backend_api/promociones/registrar-aplicacion
   * Registrar que se aplicó una promoción en una venta
   */
  @Post('registrar-aplicacion')
  registrarAplicacion(
    @Body()
    body: {
      promocion_id: number;
      tipo_venta_id: number;
      venta_id: number;
      monto_ahorrado: number;
    },
  ) {
    return this.aplicadorService.registrarPromocionAplicada(
      body.promocion_id,
      body.tipo_venta_id,
      body.venta_id,
      body.monto_ahorrado,
    );
  }

  /**
   * GET /backend_api/promociones/aplicadas/:tipoVentaId/:ventaId
   * Obtener promociones aplicadas a una venta específica
   */
  @Get('aplicadas/:tipoVentaId/:ventaId')
  getPromocionesAplicadas(
    @Param('tipoVentaId', ParseIntPipe) tipoVentaId: number,
    @Param('ventaId', ParseIntPipe) ventaId: number,
  ) {
    return this.aplicadorService.getPromocionesPorVenta(tipoVentaId, ventaId);
  }

  /**
   * GET /backend_api/promociones/estadisticas
   * Obtener estadísticas de uso de promociones
   */
  @Get('estadisticas/general')
  getEstadisticas(@Query('promocionId') promocionId?: string) {
    const id = promocionId ? parseInt(promocionId) : undefined;
    return this.aplicadorService.getEstadisticasPromociones(id);
  }
}
