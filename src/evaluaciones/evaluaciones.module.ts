import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposTest } from './tipos-test.entity';
import { TiposTestService } from './tipos-test.service';
import { TiposTestController } from './tipos-test.controller';
import { GruposPreguntas } from './grupos-preguntas.entity';
import { Pregunta } from './pregunta.entity';
import { OpcionesPregunta } from './opciones-pregunta.entity';
import { PreguntasGrupo } from './preguntas-grupo.entity';
import { EvaluacionesService } from './evaluaciones.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { ResultadosTest } from './resultados-test.entity';
import { DatosEstudiante } from './datos-estudiante.entity';
import { Grado } from './grado.entity';
import { Institucion } from './institucion.entity';
import { Seccion } from './seccion.entity';
import { TrabajadorCentro } from './trabajador-centro.entity';  
import { SeccionService } from './seccion.service';
import { GradoService } from './grado.service';
import { InstitucionService } from './institucion.service';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { SeccionController } from './seccion.controller';
import { GradoController } from './grado.controller';
import { InstitucionController } from './institucion.controller';
import { TrabajadorCentroController } from './trabajador-centro.controller';
import { DatosEstudianteService } from './datos-estudiante/datos-estudiante.service';
import { DatosEstudianteController } from './datos-estudiante/datos-estudiante.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TiposTest,
      GruposPreguntas,
      Pregunta,
      OpcionesPregunta,
      PreguntasGrupo,
      ResultadosTest,
      DatosEstudiante,
      Grado,
      Institucion,
      Seccion,
      TrabajadorCentro,
    ])
  ],
  providers: [
    TiposTestService,
    EvaluacionesService,
    SeccionService,
    GradoService,
    InstitucionService,
    TrabajadorCentroService,
    DatosEstudianteService
  ],
  controllers: [
    TiposTestController,
    EvaluacionesController,
    SeccionController,
    GradoController,
    InstitucionController,
    TrabajadorCentroController,
    DatosEstudianteController
  ],
  exports: [
    TiposTestService,
    EvaluacionesService,
    SeccionService,
    GradoService,
    InstitucionService,
    TrabajadorCentroService,
    DatosEstudianteService
  ],
})
export class EvaluacionesModule {} 