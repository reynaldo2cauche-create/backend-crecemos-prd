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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaProducto,
      Proveedor,
      Producto,
      CompraReposicion,
      CompraReposicionDetalle,
      ServicioTarifa,
    ]),
  ],
  providers: [
    CategoriaProductoService,
    ProveedorService,
    ProductoService,
    CompraReposicionService,
    ServicioTarifaService,
  ],
  controllers: [
    CategoriaProductoController,
    ProveedorController,
    ProductoController,
    CompraReposicionController,
    ServicioTarifaController,
  ],
  exports: [ProductoService],
})
export class InventarioModule {}
