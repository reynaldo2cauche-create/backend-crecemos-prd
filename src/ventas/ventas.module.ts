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

// ✅ FIX: importar VentaPromocionAplicada para poder inyectar su repositorio en los services
import { VentaPromocionAplicada } from '../promociones/entities/venta-promocion-aplicada.entity';

import { CompradorExternoService } from './services/comprador-externo.service';
import { VentaServicioService } from './services/venta-servicio.service';
import { VentaProductoService } from './services/venta-producto.service';
import { ReportesService } from './services/reportes.service';

import { CompradorExternoController } from './controllers/comprador-externo.controller';
import { VentaServicioController } from './controllers/venta-servicio.controller';
import { VentaProductoController } from './controllers/venta-producto.controller';
import { ReportesController } from './controllers/reportes.controller';
import { TipoComprobante } from './entities/tipo-comprobante.entity';
import { TipoComprobanteService } from './services/tipo-comprobante.service';
import { TipoComprobanteController } from './controllers/tipo-comprobante.controller';
import { ServicioTarifa } from 'src/inventario/entities/servicio-tarifa.entity';
import { ServicioPaquetePrecio } from 'src/inventario/entities/servicio-paquete-precio.entity';
import { PaqueteCombo } from 'src/inventario/entities/paquete-combo.entity';
import { PaqueteComboItem } from 'src/inventario/entities/paquete-combo-item.entity';
import { DocumentoTarifa } from 'src/inventario/entities/documento-tarifa.entity';
import { ModalidadPago } from 'src/historia-clinica/entities/modalidad-pago.entity';
import { ComprobanteService } from './services/comprobante.service';

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
      ServicioTarifa,
      ServicioPaquetePrecio,
      Paquete,
      PaqueteCombo,
      PaqueteComboItem,
      DocumentoTarifa,
      Producto,
      TipoComprobante,
      // ✅ FIX: registrar VentaPromocionAplicada para que los services puedan inyectar su repo
      VentaPromocionAplicada,
      ModalidadPago,
      
    ]),
  ],
  providers: [
    CompradorExternoService,
    VentaServicioService,
    VentaProductoService,
    TipoComprobanteService,
    ComprobanteService,
    ReportesService,
  ],
  controllers: [
    CompradorExternoController,
    VentaServicioController,
    VentaProductoController,
    TipoComprobanteController,
    ReportesController,
  ],
  exports: [VentaServicioService],
})
export class VentasModule {}