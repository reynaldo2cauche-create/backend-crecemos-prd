import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TipoVentaServicio } from './entities/tipo-venta-servicio.entity';
import { TipoPagador } from './entities/tipo-pagador.entity';
import { TipoDescuento } from './entities/tipo-descuento.entity';
import { CompradorExterno } from './entities/comprador-externo.entity';
import { VentaServicio } from './entities/venta-servicio.entity';
import { VentaServicioDetalle } from './entities/venta-servicio-detalle.entity';
import { VentaProducto } from './entities/venta-producto.entity';
import { VentaProductoDetalle } from './entities/venta-producto-detalle.entity';

import { Paciente } from '../pacientes/paciente.entity';
import { PacienteResponsable } from '../pacientes/entities/paciente-responsable.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { Paquete } from '../catalogos/paquete.entity';
import { Producto } from '../inventario/entities/producto.entity';

import { CompradorExternoService } from './services/comprador-externo.service';
import { VentaServicioService } from './services/venta-servicio.service';
import { VentaProductoService } from './services/venta-producto.service';

import { CompradorExternoController } from './controllers/comprador-externo.controller';
import { VentaServicioController } from './controllers/venta-servicio.controller';
import { VentaProductoController } from './controllers/venta-producto.controller';
import { TipoComprobante } from './entities/tipo-comprobante.entity';
import { TipoComprobanteService } from './services/tipo-comprobante.service';
import { TipoComprobanteController } from './controllers/tipo-comprobante.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoVentaServicio,
      TipoPagador,
      TipoDescuento,
      CompradorExterno,
      VentaServicio,
      VentaServicioDetalle,
      VentaProducto,
      VentaProductoDetalle,
      // Entidades externas necesarias para los repositorios
      Paciente,
      PacienteResponsable,
      Servicios,
      Paquete,
      Producto,
      TipoComprobante,
    ]),
  ],
  providers: [
    CompradorExternoService,
    VentaServicioService,
    VentaProductoService,
    TipoComprobanteService
  ],
  controllers: [
    CompradorExternoController,
    VentaServicioController,
    VentaProductoController,
    TipoComprobanteController
  ],
  exports: [VentaServicioService],
})
export class VentasModule {}
