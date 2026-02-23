import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoDocumento } from './tipo-documento.entity';
import { Sexo } from './sexo.entity';
import { Distrito } from './distrito.entity';
import { Provincia } from './provincia.entity';
import { RelacionResponsable } from './relacion-responsable.entity';
import { AreaServicio } from './area-servicio.entity';
import { Servicios } from './servicios.entity';
import { GradoEscolar } from './grado-escolar.entity';
import { Atenciones } from './atenciones.entity';
import { RelacionPadres } from './relacion-padres.entity';
import { AntecedentesFamiliares } from './antecedentes-familiares.entity';
import { Ocupaciones } from './ocupaciones.entity';
import { EstadoCivil } from './estado-civil.entity';
import { Parentesco } from './parentesco.entity';
import { NivelEducacion } from './nivel-educacion.entity';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import { Paquete } from './paquete.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    TipoDocumento, Sexo, Distrito, Provincia, Paquete,RelacionResponsable, AreaServicio, Servicios, GradoEscolar, Atenciones, RelacionPadres, AntecedentesFamiliares, Ocupaciones, EstadoCivil, Parentesco, NivelEducacion
  ])],
  providers: [CatalogosService],
  controllers: [CatalogosController],
  exports: [CatalogosService]
})
export class CatalogosModule {}