import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibroReclamacionesController } from './libro-reclamaciones.controller';
import { LibroReclamacionesService } from './libro-reclamaciones.service';
import { LibroReclamacion } from './entities/reclamo.entity';
import { LibroReclamacionesEstado } from './entities/estado.entity';
import { LibroReclamacionesTipoSolicitud } from './entities/tipo-solicitud.entity';
import { LibroReclamacionesTipoBien } from './entities/tipo-bien.entity';
import { LibroReclamacionesDocumento } from './entities/documento.entity';
import { LibroReclamacionesSeguimiento } from './entities/seguimiento.entity';
import { LibroReclamacionesConfig } from './entities/config.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LibroReclamacion,
      LibroReclamacionesEstado,
      LibroReclamacionesTipoSolicitud,
      LibroReclamacionesTipoBien,
      LibroReclamacionesDocumento,
      LibroReclamacionesSeguimiento,
      LibroReclamacionesConfig,
    ]),
    MailModule,
  ],
  controllers: [LibroReclamacionesController],
  providers: [LibroReclamacionesService],
  exports: [LibroReclamacionesService],
})
export class LibroReclamacionesModule {}
