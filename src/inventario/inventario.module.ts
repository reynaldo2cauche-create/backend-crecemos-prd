import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriaProducto } from './entities/categoria-producto.entity';
import { Proveedor } from './entities/proveedor.entity';
import { Producto } from './entities/producto.entity';
import { CompraReposicion } from './entities/compra-reposicion.entity';
import { CompraReposicionDetalle } from './entities/compra-reposicion-detalle.entity';

import { CategoriaProductoService } from './services/categoria-producto.service';
import { ProveedorService } from './services/proveedor.service';
import { ProductoService } from './services/producto.service';
import { CompraReposicionService } from './services/compra-reposicion.service';

import { CategoriaProductoController } from './controllers/categoria-producto.controller';
import { ProveedorController } from './controllers/proveedor.controller';
import { ProductoController } from './controllers/producto.controller';
import { CompraReposicionController } from './controllers/compra-reposicion.controller';
import { ServicioTarifa } from './entities/servicio-tarifa.entity';
import { ServicioTarifaService } from './services/servicio-tarifa.service';
import { ServicioTarifaController } from './controllers/servicio-tarifa.controller';
import { ServicioPaquetePrecio } from './entities/servicio-paquete-precio.entity';
import { ServicioPaquetePrecioService } from './services/servicio-paquete-precio.service';
import { ServicioPaquetePrecioController } from './controllers/servicio-paquete-precio.controller';
import { DocumentoTarifa } from './entities/documento-tarifa.entity';
import { DocumentoTarifaService } from './services/documento-tarifa.service';
import { DocumentoTarifaController } from './controllers/documento-tarifa.controller';
import { TipoArchivo } from '../historia-clinica/entities/tipo-archivo.entity';
import { Paquete } from '../catalogos/paquete.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaProducto,
      Proveedor,
      Producto,
      CompraReposicion,
      CompraReposicionDetalle,
      ServicioTarifa,
      ServicioPaquetePrecio,
      DocumentoTarifa,
      TipoArchivo,
      Paquete,
    ]),
  ],
  providers: [
    CategoriaProductoService,
    ProveedorService,
    ProductoService,
    CompraReposicionService,
    ServicioTarifaService,
    ServicioPaquetePrecioService,
    DocumentoTarifaService,
  ],
  controllers: [
    CategoriaProductoController,
    ProveedorController,
    ProductoController,
    CompraReposicionController,
    ServicioTarifaController,
    ServicioPaquetePrecioController,
    DocumentoTarifaController,
  ],
  exports: [ProductoService, DocumentoTarifaService],
})
export class InventarioModule {}
