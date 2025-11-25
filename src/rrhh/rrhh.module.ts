import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Pago } from './pago.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrabajadorCentro, Pago])],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class RrhhModule {}
