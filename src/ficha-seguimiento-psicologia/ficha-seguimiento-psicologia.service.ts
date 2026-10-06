import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { FichaSeguimientoPsicologia } from './ficha-seguimiento-psicologia.entity';
import { CreateFichaSeguimientoPsicologiaDto } from './dto/create-ficha-seguimiento-psicologia.dto';
import { ESCALA_COLS, TEXT_COLS, RESPUESTA_COLS } from './ficha-seguimiento-psicologia.columns';

@Injectable()
export class FichaSeguimientoPsicologiaService {
  constructor(
    @InjectRepository(FichaSeguimientoPsicologia)
    private readonly fichaRepo: Repository<FichaSeguimientoPsicologia>,
  ) {}

  private generarToken(): string {
    return randomBytes(24).toString('hex'); // 48 caracteres
  }

  private calcularEdad(fechaNacimiento?: Date): number | null {
    if (!fechaNacimiento) return null;
    const nac = new Date(fechaNacimiento);
    if (isNaN(nac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  private nombreEstudiante(ficha: FichaSeguimientoPsicologia): string {
    const p = ficha.paciente;
    if (!p) return '';
    return [p.nombres, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // Objeto plano con cabecera + una clave por columna de respuesta
  private toDto(f: FichaSeguimientoPsicologia) {
    const dto: any = {
      id: f.id,
      token: f.token,
      estado: f.estado,
      estudiante: this.nombreEstudiante(f),
      edad: this.calcularEdad(f.paciente?.fecha_nacimiento),
      periodo_observacion: f.periodo_observacion,
      fecha_entrega: f.fecha_entrega,
      fecha_devolucion: f.fecha_devolucion,
      docente_nombre: f.docente_nombre,
      nivel_grado: f.nivel_grado,
      institucion_educativa: f.institucion_educativa,
      fecha_crea: f.fecha_crea,
      fecha_completado: f.fecha_completado,
    };
    RESPUESTA_COLS.forEach((c) => {
      dto[c] = (f as any)[c];
    });
    return dto;
  }

  async crear(dto: CreateFichaSeguimientoPsicologiaDto) {
    const ficha = this.fichaRepo.create({
      paciente_id: dto.paciente_id,
      token: this.generarToken(),
      estado: 'PENDIENTE',
      periodo_observacion: dto.periodo_observacion ?? null,
      fecha_entrega: new Date(), // se registra al crear la solicitud (admisión/admin)
      user_id_crea: dto.user_id_crea ?? null,
    });
    const guardada = await this.fichaRepo.save(ficha);
    return { id: guardada.id, token: guardada.token, estado: guardada.estado };
  }

  async listarPorPaciente(pacienteId: number) {
    const fichas = await this.fichaRepo.find({
      where: { paciente_id: pacienteId },
      order: { fecha_crea: 'DESC' },
    });
    return fichas.map((f) => this.toDto(f));
  }

  /** Datos que ve la docente (endpoint público). */
  async obtenerPublico(token: string) {
    const ficha = await this.fichaRepo.findOne({ where: { token } });
    if (!ficha) {
      throw new NotFoundException('La ficha solicitada no existe o el enlace es inválido.');
    }
    return this.toDto(ficha);
  }

  /**
   * La docente envía la ficha (endpoint público). Solo una vez.
   * `body` trae cabecera de la docente + una clave por columna de respuesta.
   */
  async completar(token: string, body: Record<string, any>) {
    const ficha = await this.fichaRepo.findOne({ where: { token } });
    if (!ficha) {
      throw new NotFoundException('La ficha solicitada no existe o el enlace es inválido.');
    }
    if (ficha.estado === 'COMPLETADA') {
      throw new ConflictException('Esta ficha ya fue completada y no puede modificarse.');
    }

    // Cabecera de la docente
    ficha.docente_nombre = body.docente_nombre ?? null;
    ficha.nivel_grado = body.nivel_grado ?? null;
    ficha.institucion_educativa = body.institucion_educativa ?? null;
    ficha.fecha_devolucion = new Date(); // se registra cuando la docente envía la ficha

    // Respuestas: asignar solo columnas conocidas, con la coerción correcta
    RESPUESTA_COLS.forEach((col) => {
      if (body[col] === undefined) return;
      let value: any = body[col];
      if (ESCALA_COLS.includes(col)) {
        value = value === '' || value === null ? null : Number(value); // 0..3, '' → null
      } else if (TEXT_COLS.includes(col)) {
        value = value === '' ? null : value;
      }
      (ficha as any)[col] = value;
    });

    ficha.estado = 'COMPLETADA';
    ficha.fecha_completado = new Date();

    await this.fichaRepo.save(ficha);
    return { ok: true, estado: ficha.estado };
  }

  async anular(id: number) {
    const ficha = await this.fichaRepo.findOne({ where: { id } });
    if (!ficha) {
      throw new NotFoundException('Ficha no encontrada.');
    }
    if (ficha.estado === 'COMPLETADA') {
      throw new ConflictException('No se puede anular una ficha ya completada.');
    }
    await this.fichaRepo.remove(ficha);
    return { ok: true };
  }
}
