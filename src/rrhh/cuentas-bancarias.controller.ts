import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CrearCuentaBancariaDto } from './dto/crear-cuenta-bancaria.dto';
import { ActualizarCuentaBancariaDto } from './dto/actualizar-cuenta-bancaria.dto';

@Controller('backend_api/cuentas-bancarias')
export class CuentasBancariasController {
  constructor(private readonly cuentasService: CuentasBancariasService) {}

  /**
   * GET /cuentas-bancarias/trabajador/:trabajadorId
   * Obtiene todas las cuentas bancarias de un trabajador
   */
  @Get('trabajador/:trabajadorId')
  async obtenerCuentasPorTrabajador(@Param('trabajadorId', ParseIntPipe) trabajadorId: number) {
    return await this.cuentasService.obtenerCuentasPorTrabajador(trabajadorId);
  }

  /**
   * GET /cuentas-bancarias/:id
   * Obtiene una cuenta bancaria por ID
   */
  @Get(':id')
  async obtenerCuentaPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.cuentasService.obtenerCuentaPorId(id);
  }

  /**
   * POST /cuentas-bancarias
   * Crea una nueva cuenta bancaria
   */
  @Post()
  async crearCuenta(@Body() dto: CrearCuentaBancariaDto) {
    return await this.cuentasService.crearCuenta(dto);
  }

  /**
   * PUT /cuentas-bancarias/:id
   * Actualiza una cuenta bancaria
   */
  @Put(':id')
  async actualizarCuenta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCuentaBancariaDto,
  ) {
    return await this.cuentasService.actualizarCuenta(id, dto);
  }

  /**
   * PUT /cuentas-bancarias/:id/marcar-principal
   * Marca una cuenta como principal
   */
  @Put(':id/marcar-principal')
  async marcarComoPrincipal(@Param('id', ParseIntPipe) id: number) {
    return await this.cuentasService.marcarComoPrincipal(id);
  }

  /**
   * DELETE /cuentas-bancarias/:id
   * Elimina una cuenta bancaria
   */
  @Delete(':id')
  async eliminarCuenta(@Param('id', ParseIntPipe) id: number) {
    await this.cuentasService.eliminarCuenta(id);
    return { message: 'Cuenta bancaria eliminada correctamente' };
  }
}
