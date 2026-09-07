import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Falta } from './falta.entity';
import { TipoFalta } from './tipo-falta.entity';
import { Mes } from './mes.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { CrearFaltaDto } from './dto/crear-falta.dto';
import { ActualizarFaltaDto } from './dto/actualizar-falta.dto';
import { CrearTipoFaltaDto, ActualizarTipoFaltaDto } from './dto/tipo-falta.dto';

@Injectable()
export class FaltasService {
  constructor(
    @InjectRepository(Falta)
    private faltasRepository: Repository<Falta>,
    @InjectRepository(TipoFalta)
    private tipoFaltaRepository: Repository<TipoFalta>,
    @InjectRepository(Mes)
    private mesRepository: Repository<Mes>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
  ) {}

  /** Convierte el CSV dias_laborables ("1,2,5") en un Set de números ISO (1=Lunes..7=Domingo). */
  private parseDiasLaborables(csv: string | null | undefined): Set<number> {
    if (!csv) return new Set();
    return new Set(
      csv
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 7),
    );
  }

  /** Día ISO (1=Lunes..7=Domingo) de una fecha en UTC. */
  private isoWeekday(fecha: Date): number {
    const d = fecha.getUTCDay(); // 0=domingo..6=sábado
    return d === 0 ? 7 : d;
  }

  /** Cuenta cuántos días labora en un mes calendario según su horario (mesIndex: 0=enero..11=diciembre). */
  private contarDiasLaborablesEnMes(diasLaborables: Set<number>, anio: number, mesIndex: number): number {
    let count = 0;
    for (
      let d = new Date(Date.UTC(anio, mesIndex, 1));
      d.getUTCMonth() === mesIndex;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (diasLaborables.has(this.isoWeekday(d))) count++;
    }
    return count;
  }

  private toUTCDate(fecha: string | Date): Date {
    const str = typeof fecha === 'string' ? fecha.split('T')[0] : this.formatearFecha(fecha);
    return new Date(`${str}T00:00:00Z`);
  }

  private round2(n: number): number {
    return parseFloat(n.toFixed(2));
  }

  /**
   * Calcula el desglose del descuento de una falta según el horario del empleado.
   * valor día = sueldo_base / (diasSemana * 52 / 12)   (ej 3 días/sem → /13, 6 → /26)
   * dias = días laborables dentro del rango [inicio..fin] según su horario.
   */
  private calcularDescuento(
    empleado: TrabajadorCentro,
    fechaInicio: string,
    fechaFin: string,
    descuenta: boolean,
  ): { dias: number; valorDia: number; montoDescuento: number } {
    const diasLaborables = this.parseDiasLaborables(empleado.dias_laborables);

    if (diasLaborables.size === 0) {
      throw new BadRequestException(
        'El empleado no tiene días laborables (horario) configurados. Configúralo antes de registrar faltas.',
      );
    }
    if (!empleado.sueldo_base || Number(empleado.sueldo_base) <= 0) {
      throw new BadRequestException(
        'El empleado no tiene sueldo base configurado. Configúralo antes de registrar faltas.',
      );
    }

    const inicio = this.toUTCDate(fechaInicio);
    const fin = this.toUTCDate(fechaFin);

    if (fin < inicio) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
    }

    // Divisor = días que realmente trabaja en ESE mes (el pago es mensual),
    // según su horario. Ej: en un mes con 13 días L-M-V, valor día = sueldo / 13.
    const divisor = this.contarDiasLaborablesEnMes(
      diasLaborables,
      inicio.getUTCFullYear(),
      inicio.getUTCMonth(),
    );
    const valorDia = this.round2(Number(empleado.sueldo_base) / divisor);

    let dias = 0;
    for (let d = new Date(inicio); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
      if (diasLaborables.has(this.isoWeekday(d))) dias++;
    }

    const montoDescuento = descuenta ? this.round2(dias * valorDia) : 0;
    return { dias, valorDia, montoDescuento };
  }

  async getTipos(): Promise<TipoFalta[]> {
    return this.tipoFaltaRepository.find({
      where: { activo: true },
      order: { id: 'ASC' },
    });
  }

  /** Todos los tipos (incluye inactivos) para la pantalla de configuración. */
  async getTiposAll(): Promise<TipoFalta[]> {
    return this.tipoFaltaRepository.find({ order: { id: 'ASC' } });
  }

  private slugCodigo(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quitar tildes
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);
  }

  async crearTipo(dto: CrearTipoFaltaDto): Promise<TipoFalta> {
    let codigo = this.slugCodigo(dto.nombre) || `TIPO_${Date.now()}`;
    // asegurar unicidad del codigo
    let intento = codigo;
    let n = 2;
    while (await this.tipoFaltaRepository.findOne({ where: { codigo: intento } })) {
      intento = `${codigo}_${n++}`.slice(0, 50);
    }
    const tipo = this.tipoFaltaRepository.create({
      codigo: intento,
      nombre: dto.nombre,
      descuenta: dto.descuenta ?? true,
      activo: true,
    });
    return this.tipoFaltaRepository.save(tipo);
  }

  async actualizarTipo(id: number, dto: ActualizarTipoFaltaDto): Promise<TipoFalta> {
    const tipo = await this.tipoFaltaRepository.findOne({ where: { id } });
    if (!tipo) throw new NotFoundException(`Tipo de falta ${id} no encontrado`);
    if (dto.nombre !== undefined) tipo.nombre = dto.nombre;
    if (dto.descuenta !== undefined) tipo.descuenta = dto.descuenta;
    if (dto.activo !== undefined) tipo.activo = dto.activo;
    return this.tipoFaltaRepository.save(tipo);
  }

  async crear(dto: CrearFaltaDto): Promise<Falta> {
    const empleado = await this.trabajadorRepository.findOne({ where: { id: dto.empleadoId } });
    if (!empleado) throw new NotFoundException(`Empleado ${dto.empleadoId} no encontrado`);

    const tipo = await this.tipoFaltaRepository.findOne({ where: { id: dto.tipoFaltaId } });
    if (!tipo) throw new NotFoundException(`Tipo de falta ${dto.tipoFaltaId} no encontrado`);

    const descuenta = dto.descuenta ?? tipo.descuenta;

    // El monto lo ingresa RRHH manualmente. Si viene en el DTO, se usa tal cual
    // (sin exigir horario/sueldo). Si no viene, se calcula por horario (fallback).
    let dias: number;
    let valorDia: number;
    let montoDescuento: number;
    if (dto.montoDescuento != null) {
      const ini = this.toUTCDate(dto.fechaInicio);
      const fin = this.toUTCDate(dto.fechaFin);
      if (fin < ini) throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
      dias = Math.round((fin.getTime() - ini.getTime()) / 86400000) + 1;
      valorDia = 0;
      montoDescuento = descuenta ? this.round2(Number(dto.montoDescuento)) : 0;
    } else {
      ({ dias, valorDia, montoDescuento } = this.calcularDescuento(
        empleado,
        dto.fechaInicio,
        dto.fechaFin,
        descuenta,
      ));
    }

    const inicio = this.toUTCDate(dto.fechaInicio);
    const mesId = inicio.getUTCMonth() + 1;
    const anio = inicio.getUTCFullYear();
    const mes = await this.mesRepository.findOne({ where: { id: mesId } });
    if (!mes) throw new NotFoundException(`Mes ${mesId} no encontrado`);

    const usuario = dto.userId
      ? await this.trabajadorRepository.findOne({ where: { id: dto.userId } })
      : null;

    const falta = this.faltasRepository.create({
      empleado,
      tipo,
      fecha_inicio: dto.fechaInicio as any,
      fecha_fin: dto.fechaFin as any,
      descuenta,
      dias,
      valor_dia: valorDia,
      monto_descuento: montoDescuento,
      mes,
      anio,
      observaciones: dto.observaciones,
      usuarioCrea: usuario,
      usuarioActualiza: usuario,
    });

    return this.faltasRepository.save(falta);
  }

  async actualizar(id: number, dto: ActualizarFaltaDto): Promise<Falta> {
    const falta = await this.faltasRepository.findOne({
      where: { id },
      relations: ['empleado', 'tipo', 'pago'],
    });
    if (!falta) throw new NotFoundException(`Falta ${id} no encontrada`);
    if (falta.pago) {
      throw new BadRequestException(
        'No se puede editar una falta ya aplicada a un pago registrado.',
      );
    }

    if (dto.tipoFaltaId) {
      const tipo = await this.tipoFaltaRepository.findOne({ where: { id: dto.tipoFaltaId } });
      if (!tipo) throw new NotFoundException(`Tipo de falta ${dto.tipoFaltaId} no encontrado`);
      falta.tipo = tipo;
    }

    const fechaInicio = dto.fechaInicio ?? this.formatearFecha(falta.fecha_inicio);
    const fechaFin = dto.fechaFin ?? this.formatearFecha(falta.fecha_fin);
    const descuenta = dto.descuenta ?? falta.descuenta;

    const { dias, valorDia, montoDescuento } = this.calcularDescuento(
      falta.empleado,
      fechaInicio,
      fechaFin,
      descuenta,
    );

    const inicio = this.toUTCDate(fechaInicio);
    const mesId = inicio.getUTCMonth() + 1;
    const mes = await this.mesRepository.findOne({ where: { id: mesId } });

    falta.fecha_inicio = fechaInicio as any;
    falta.fecha_fin = fechaFin as any;
    falta.descuenta = descuenta;
    falta.dias = dias;
    falta.valor_dia = valorDia;
    falta.monto_descuento = montoDescuento;
    falta.mes = mes;
    falta.anio = inicio.getUTCFullYear();
    if (dto.observaciones !== undefined) falta.observaciones = dto.observaciones;
    if (dto.userId) {
      falta.usuarioActualiza = await this.trabajadorRepository.findOne({ where: { id: dto.userId } });
    }

    return this.faltasRepository.save(falta);
  }

  async findAll(empleadoId?: number, mesId?: number, anio?: number): Promise<Falta[]> {
    const query = this.faltasRepository
      .createQueryBuilder('falta')
      .leftJoinAndSelect('falta.empleado', 'empleado')
      .leftJoinAndSelect('falta.tipo', 'tipo')
      .leftJoinAndSelect('falta.mes', 'mes')
      .leftJoinAndSelect('falta.pago', 'pago')
      .leftJoinAndSelect('falta.usuarioCrea', 'usuarioCrea')
      .orderBy('falta.fecha_inicio', 'DESC');

    if (empleadoId) query.andWhere('empleado.id = :empleadoId', { empleadoId });
    if (mesId) query.andWhere('falta.mes_id = :mesId', { mesId });
    if (anio) query.andWhere('falta.anio = :anio', { anio });

    return query.getMany();
  }

  async findOne(id: number): Promise<Falta> {
    const falta = await this.faltasRepository.findOne({
      where: { id },
      relations: ['empleado', 'tipo', 'mes', 'pago'],
    });
    if (!falta) throw new NotFoundException(`Falta ${id} no encontrada`);
    return falta;
  }

  async remove(id: number): Promise<void> {
    const falta = await this.findOne(id);
    if (falta.pago) {
      throw new BadRequestException(
        'No se puede eliminar una falta ya aplicada a un pago registrado.',
      );
    }
    await this.faltasRepository.remove(falta);
  }

  private formatearFecha(fecha: Date | string): string {
    if (!fecha) return '';
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
      return fecha.split('T')[0];
    }
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
