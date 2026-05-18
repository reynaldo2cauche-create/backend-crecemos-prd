import { Module, forwardRef } from '@nestjs/common';
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
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

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
    forwardRef(() => NotificacionesModule),
  ],
  providers: [TareasService],
  controllers: [TareasController],
  exports: [TareasService],
})
export class TareasModule {}
