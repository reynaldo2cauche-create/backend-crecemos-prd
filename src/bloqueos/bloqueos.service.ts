import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BloqueoHorarios } from './entities/bloqueo-horarios.entity';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { UpdateBloqueoDto } from './dto/update-bloqueo.dto';
import { VerificarBloqueoDto } from './dto/verificar-bloqueo.dto';

@Injectable()
export class BloqueosService {
  constructor(
    @InjectRepository(BloqueoHorarios)
    private readonly bloqueoRepo: Repository<BloqueoHorarios>,
  ) {}

  async create(dto: CreateBloqueoDto): Promise<BloqueoHorarios> {
    // Validaciones
    this.validarBloqueo(dto);

    const bloqueo = this.bloqueoRepo.create({
      trabajadorId: dto.trabajadorId,
      tipoBloqueoId: dto.tipoBloqueoId,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      diaSemana: dto.diaSemana,
      todoElDia: dto.todoElDia,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      motivo: dto.motivo,
      userIdCrea: dto.userIdCrea,
    });

    return await this.bloqueoRepo.save(bloqueo);
  }

  async findAll(): Promise<BloqueoHorarios[]> {
    return await this.bloqueoRepo.find({
      where: { activo: true },
      relations: ['trabajador', 'trabajador.especialidad', 'tipoBloqueo', 'userCrea'],
      order: { fechaInicio: 'ASC', horaInicio: 'ASC' },
    });
  }

  async findByTrabajador(trabajadorId: number): Promise<BloqueoHorarios[]> {
    return await this.bloqueoRepo.find({
      where: { trabajadorId, activo: true },
      relations: ['tipoBloqueo'],
      order: { fechaInicio: 'ASC', horaInicio: 'ASC' },
    });
  }

  async findActivos(): Promise<BloqueoHorarios[]> {
    const hoy = new Date().toISOString().split('T')[0];

    return await this.bloqueoRepo
      .createQueryBuilder('bloqueo')
      .leftJoinAndSelect('bloqueo.trabajador', 'trabajador')
      .leftJoinAndSelect('trabajador.especialidad', 'especialidad')
      .leftJoinAndSelect('bloqueo.tipoBloqueo', 'tipoBloqueo')
      .leftJoinAndSelect('bloqueo.userCrea', 'userCrea')
      .where('bloqueo.activo = :activo', { activo: true })
      .andWhere('bloqueo.fechaFin >= :hoy', { hoy })
      .orderBy('bloqueo.fechaInicio', 'ASC')
      .addOrderBy('bloqueo.horaInicio', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<BloqueoHorarios> {
    const bloqueo = await this.bloqueoRepo.findOne({
      where: { id, activo: true },
      relations: ['trabajador', 'trabajador.especialidad', 'tipoBloqueo', 'userCrea'],
    });

    if (!bloqueo) {
      throw new NotFoundException(`Bloqueo con ID ${id} no encontrado`);
    }

    return bloqueo;
  }

  async update(id: number, dto: UpdateBloqueoDto): Promise<BloqueoHorarios> {
    const bloqueo = await this.findOne(id);

    // Validaciones si se actualizan campos críticos
    const dataToValidate = {
      trabajadorId: dto.trabajadorId ?? bloqueo.trabajadorId,
      tipoBloqueoId: dto.tipoBloqueoId ?? bloqueo.tipoBloqueoId,
      fechaInicio: dto.fechaInicio ?? bloqueo.fechaInicio,
      fechaFin: dto.fechaFin ?? bloqueo.fechaFin,
      todoElDia: dto.todoElDia ?? bloqueo.todoElDia,
      horaInicio: dto.horaInicio ?? bloqueo.horaInicio,
      horaFin: dto.horaFin ?? bloqueo.horaFin,
    };
    this.validarBloqueo(dataToValidate as CreateBloqueoDto);

    Object.assign(bloqueo, dto);
    bloqueo.fechaActua = new Date();

    return await this.bloqueoRepo.save(bloqueo);
  }

  async delete(id: number, userId?: number): Promise<void> {
    const bloqueo = await this.findOne(id);
    bloqueo.activo = false;
    bloqueo.userIdActua = userId;
    bloqueo.fechaActua = new Date();
    await this.bloqueoRepo.save(bloqueo);
  }

  async verificarBloqueado(dto: VerificarBloqueoDto): Promise<boolean> {
    const { trabajadorId, fecha, hora } = dto;

    // Obtener día de la semana (0=Domingo, 1=Lunes, etc.).
    // 'fecha' viene como 'YYYY-MM-DD' y se parsea como medianoche UTC; se usa
    // getUTCDay() para que el día NO se corra según la zona horaria del servidor
    // (con getDay() en un server UTC-5 el miércoles se calculaba como martes).
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();

    const query = this.bloqueoRepo
      .createQueryBuilder('bloqueo')
      .leftJoinAndSelect('bloqueo.tipoBloqueo', 'tipoBloqueo')
      .where('bloqueo.trabajadorId = :trabajadorId', { trabajadorId })
      .andWhere('bloqueo.activo = :activo', { activo: true });

    // Bloqueos puntuales
    query.andWhere(
      `(
        (tipoBloqueo.codigo = 'PUNTUAL' AND bloqueo.fechaInicio = :fecha)
        OR
        (tipoBloqueo.codigo = 'RECURRENTE'
         AND bloqueo.diaSemana = :diaSemana
         AND :fecha BETWEEN bloqueo.fechaInicio AND bloqueo.fechaFin)
      )`,
      { fecha, diaSemana }
    );

    const bloqueos = await query.getMany();

    // Verificar horario
    for (const bloqueo of bloqueos) {
      if (bloqueo.todoElDia) {
        return true; // Bloqueado todo el día
      }

      if (bloqueo.horaInicio && bloqueo.horaFin) {
        if (hora >= bloqueo.horaInicio && hora < bloqueo.horaFin) {
          return true; // Bloqueado en ese horario
        }
      }
    }

    return false;
  }

  async obtenerHorariosDisponibles(
    trabajadorId: number,
    fecha: string,
    horaInicio: string = '08:00:00',
    horaFin: string = '20:00:00',
    intervaloMinutos: number = 30,
  ): Promise<string[]> {
    const horariosDisponibles: string[] = [];

    // Generar todos los horarios posibles
    let horaActual = horaInicio;
    while (horaActual < horaFin) {
      const estaBlocked = await this.verificarBloqueado({
        trabajadorId,
        fecha,
        hora: horaActual,
      });

      if (!estaBlocked) {
        horariosDisponibles.push(horaActual);
      }

      // Incrementar hora
      const [h, m] = horaActual.split(':').map(Number);
      const totalMinutos = h * 60 + m + intervaloMinutos;
      const nuevaHora = Math.floor(totalMinutos / 60);
      const nuevosMinutos = totalMinutos % 60;
      horaActual = `${String(nuevaHora).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}:00`;
    }

    return horariosDisponibles;
  }

  private validarBloqueo(dto: CreateBloqueoDto | any): void {
    // Validar que fecha_fin >= fecha_inicio
    if (dto.fechaFin < dto.fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser mayor o igual a la fecha de inicio');
    }

    // Validar horario
    if (!dto.todoElDia) {
      if (!dto.horaInicio || !dto.horaFin) {
        throw new BadRequestException('Debe especificar hora de inicio y fin si no es todo el día');
      }
      if (dto.horaFin <= dto.horaInicio) {
        throw new BadRequestException('La hora de fin debe ser mayor a la hora de inicio');
      }
    }

    // Validar día de semana para recurrentes
    if (dto.tipoBloqueoId === 2) { // RECURRENTE
      if (dto.diaSemana === null || dto.diaSemana === undefined) {
        throw new BadRequestException('Debe especificar el día de la semana para bloqueos recurrentes');
      }
      if (dto.diaSemana < 0 || dto.diaSemana > 6) {
        throw new BadRequestException('El día de la semana debe estar entre 0 (Domingo) y 6 (Sábado)');
      }
    }
  }
}
