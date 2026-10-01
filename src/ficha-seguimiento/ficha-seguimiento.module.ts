import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FichaSeguimientoEscolar } from './ficha-seguimiento.entity';
import { FichaSeguimientoController } from './ficha-seguimiento.controller';
import { FichaSeguimientoService } from './ficha-seguimiento.service';
import { GeofencingModule } from '../geofencing/geofencing.module';

@Module({
  imports: [TypeOrmModule.forFeature([FichaSeguimientoEscolar]), GeofencingModule],
  controllers: [FichaSeguimientoController],
  providers: [FichaSeguimientoService],
  exports: [FichaSeguimientoService],
})
export class FichaSeguimientoModule {}
