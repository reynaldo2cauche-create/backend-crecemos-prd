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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromocionService } from '../services/promocion.service';
import { AplicadorPromocionService } from '../services/aplicador-promocion.service';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';
import { AplicarPromocionDto } from '../dto/aplicar-promocion.dto';
import { TipoAlcancePromo } from '../entities/tipo-alcance-promo.entity';
import { TipoCondicionPromo } from '../entities/tipo-condicion-promo.entity';
import { TipoBeneficioPromo } from '../entities/tipo-beneficio-promo.entity';

@Controller('backend_api/promociones')
@UseGuards(JwtAuthGuard)
export class PromocionController {
  constructor(
    private readonly promocionService: PromocionService,
    private readonly aplicadorService: AplicadorPromocionService,
    @InjectRepository(TipoAlcancePromo)
    private readonly tipoAlcanceRepo: Repository<TipoAlcancePromo>,
    @InjectRepository(TipoCondicionPromo)
    private readonly tipoCondicionRepo: Repository<TipoCondicionPromo>,
    @InjectRepository(TipoBeneficioPromo)
    private readonly tipoBeneficioRepo: Repository<TipoBeneficioPromo>,
  ) {}

  /** GET /backend_api/promociones */
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

  /** GET /backend_api/promociones/vigentes */
  @Get('vigentes')
  getVigentes(@Query('fecha') fecha?: string) {
    return this.promocionService.getPromocionesVigentes(
      fecha ? new Date(fecha) : undefined,
    );
  }

  /**
   * GET /backend_api/promociones/tipos
   * Devuelve los catálogos de tipos para el formulario (alcance, condición, beneficio)
   */
  @Get('tipos')
  async getTipos() {
    const [tiposAlcance, tiposCondicion, tiposBeneficio] = await Promise.all([
      this.tipoAlcanceRepo.find(),
      this.tipoCondicionRepo.find(),
      this.tipoBeneficioRepo.find(),
    ]);
    return { tiposAlcance, tiposCondicion, tiposBeneficio };
  }

  /**
   * GET /backend_api/promociones/catalogo
   * Devuelve productos (con categoría), servicios (con motivos) y paquetes
   * para que el frontend pueda construir el selector de alcances de forma visual.
   */
  @Get('catalogo')
  getCatalogo() {
    return this.promocionService.getCatalogoAlcances();
  }

  /** GET /backend_api/promociones/estadisticas/general */
  @Get('estadisticas/general')
  getEstadisticas(@Query('promocionId') promocionId?: string) {
    const id = promocionId ? parseInt(promocionId) : undefined;
    return this.aplicadorService.getEstadisticasPromociones(id);
  }

  /** GET /backend_api/promociones/aplicadas/:tipoVentaId/:ventaId */
  @Get('aplicadas/:tipoVentaId/:ventaId')
  getPromocionesAplicadas(
    @Param('tipoVentaId', ParseIntPipe) tipoVentaId: number,
    @Param('ventaId', ParseIntPipe) ventaId: number,
  ) {
    return this.aplicadorService.getPromocionesPorVenta(tipoVentaId, ventaId);
  }

  /** GET /backend_api/promociones/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promocionService.findOne(id);
  }

  /** POST /backend_api/promociones */
  @Post()
  create(@Body() createDto: CreatePromocionDto) {
    return this.promocionService.create(createDto);
  }

  /** POST /backend_api/promociones/calcular */
  @Post('calcular')
  calcular(@Body() dto: AplicarPromocionDto) {
    return this.aplicadorService.calcularPromociones(dto);
  }

  /** POST /backend_api/promociones/registrar-aplicacion */
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

  /** PUT /backend_api/promociones/:id */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePromocionDto,
  ) {
    return this.promocionService.update(id, updateDto);
  }

  /** PATCH /backend_api/promociones/:id/activar */
  @Patch(':id/activar')
  activar(
    @Param('id', ParseIntPipe) id: number,
    @Body('user_id') userId?: number,
  ) {
    return this.promocionService.toggleActivo(id, true, userId);
  }

  /** PATCH /backend_api/promociones/:id/desactivar */
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @Body('user_id') userId?: number,
  ) {
    return this.promocionService.toggleActivo(id, false, userId);
  }

  /** DELETE /backend_api/promociones/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promocionService.remove(id);
  }
}