import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibroReclamacionService } from './libro-reclamacion.service';
import { LibroReclamacionController } from './libro-reclamacion.controller';
import { LibroReclamacion } from './entities/libro-reclamacion.entity';
import { LibroReclamacionDocumento } from './entities/libro-reclamacion-documento.entity';
import { LibroReclamacionSeguimiento } from './entities/libro-reclamacion-seguimiento.entity'
import { AuthModule } from '../auth/auth.module';

@Module({
 imports: [TypeOrmModule.forFeature([LibroReclamacion, LibroReclamacionDocumento, LibroReclamacionSeguimiento]),AuthModule,],
  controllers: [LibroReclamacionController],
  providers: [LibroReclamacionService],
  exports: [TypeOrmModule],
})
export class LibroReclamacionModule {}
