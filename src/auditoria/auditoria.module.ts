import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaAccion } from './auditoria-accion.entity';
import { AlertaSistema } from './alerta-sistema.entity';
import { ConfiguracionAlerta } from './configuracion-alerta.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { AuditoriaService } from './auditoria.service';
import { AlertasService } from './alertas.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditoriaAccion,
      AlertaSistema,
      ConfiguracionAlerta,
      TrabajadorCentro,  // ✅ Agregado para que el interceptor pueda consultar datos del usuario
    ]),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, AlertasService, AuditoriaInterceptor],
  exports: [AuditoriaService, AlertasService, AuditoriaInterceptor,TypeOrmModule,],
})
export class AuditoriaModule {}
