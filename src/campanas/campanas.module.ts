import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampanasService } from './services/campanas.service';
import { CampanasController } from './controllers/campanas.controller';
import { Campana } from './entities/campana.entity';
import { CampanaEstado } from './entities/campana-estado.entity';
import { CampanaSeccion } from './entities/campana-seccion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campana, CampanaEstado, CampanaSeccion]),
  ],
  controllers: [CampanasController],
  providers: [CampanasService],
  exports: [CampanasService],
})
export class CampanasModule {}
