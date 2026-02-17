import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CompraService } from './compra.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('backend_api/compras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompraController {
  constructor(private readonly compraService: CompraService) {}

  /**
   * 🛒 POST /compras
   * Crear una nueva compra (individual o paquete)
   */
  @Post()
  @Roles('Administrador', 'Admision')
  async crearCompra(@Body() dto: CrearCompraDto) {
    return this.compraService.crearCompra(dto);
  }

  /**
   * 📋 GET /compras/paciente/:pacienteId
   * Obtener todas las compras de un paciente
   */
  @Get('paciente/:pacienteId')
  @Roles('Administrador', 'Admision', 'Terapeuta')
  async obtenerComprasPaciente(@Param('pacienteId') pacienteId: number) {
    return this.compraService.obtenerComprasPaciente(pacienteId);
  }

  /**
   * 📦 GET /compras/paciente/:pacienteId/disponibles
   * Obtener paquetes disponibles del paciente (con sesiones restantes)
   */
  @Get('paciente/:pacienteId/disponibles')
  @Roles('Administrador', 'Admision', 'Terapeuta')
  async obtenerPaquetesDisponibles(@Param('pacienteId') pacienteId: number) {
    return this.compraService.obtenerPaquetesDisponibles(pacienteId);
  }

  /**
   * 🔍 GET /compras/:id
   * Obtener detalle de una compra
   */
  @Get(':id')
  @Roles('Administrador', 'Admision', 'Terapeuta')
  async obtenerCompra(@Param('id') id: number) {
    return this.compraService.obtenerCompra(id);
  }

  /**
   * ✅ POST /compras/:id/usar-sesion
   * Marcar sesión como usada (cuando se agenda una cita)
   */
  @Post(':id/usar-sesion')
  @Roles('Administrador', 'Admision', 'Terapeuta')
  async usarSesion(@Param('id') id: number) {
    return this.compraService.usarSesion(id);
  }

  /**
   * ↩️ POST /compras/:id/liberar-sesion
   * Liberar sesión (cuando se cancela/elimina una cita)
   */
  @Post(':id/liberar-sesion')
  @Roles('Administrador', 'Admision', 'Terapeuta')
  async liberarSesion(@Param('id') id: number) {
    return this.compraService.liberarSesion(id);
  }

  /**
   * 🗑️ DELETE /compras/:id
   * Eliminar una compra (solo si no tiene sesiones usadas)
   */
  @Delete(':id')
  @Roles('Administrador')
  async eliminarCompra(@Param('id') id: number) {
    return this.compraService.eliminarCompra(id);
  }
}
