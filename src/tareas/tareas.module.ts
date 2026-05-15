import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TareasService } from './tareas.service';
import { TareasController } from './tareas.controller';
import { Tarea } from './entities/tarea.entity';
import { TareaAsignacion } from './entities/tarea-asignacion.entity';
import { TareaComentario } from './entities/tarea-comentario.entity';
import { TareaPrioridad } from './entities/tarea-prioridad.entity';
import { TareaColumna } from './entities/tarea-columna.entity';
import { TareaArchivo } from './entities/tarea-archivo.entity';
import { TareaComentarioArchivo } from './entities/tarea-comentario-archivo.entity';
import { TareaTimer } from './entities/tarea-timer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tarea,
      TareaAsignacion,
      TareaComentario,
      TareaPrioridad,
      TareaColumna,
      TareaArchivo,
      TareaComentarioArchivo,
      TareaTimer,
    ]),
  ],
  providers: [TareasService],
  controllers: [TareasController],
  exports: [TareasService],
})
export class TareasModule {}
