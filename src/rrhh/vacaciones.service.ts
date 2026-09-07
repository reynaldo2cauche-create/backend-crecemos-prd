import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacacion } from './vacacion.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { RegistrarVacacionDto } from './dto/registrar-vacacion.dto';
import { CalcularVacacionesDto } from './dto/calcular-vacaciones.dto';

@Injectable()
export class VacacionesService {
  constructor(
    @InjectRepository(Vacacion)
    private vacacionesRepository: Repository<Vacacion>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
  ) {}

  private calcularAniosTrabajados(fechaIngreso: Date, fechaReferencia: Date = new Date()): number {
    const inicio = new Date(fechaIngreso);
    const referencia = new Date(fechaReferencia);

    let anios = referencia.getFullYear() - inicio.getFullYear();
    const mesReferencia = referencia.getMonth();
    const mesInicio = inicio.getMonth();

    if (mesReferencia < mesInicio ||
        (mesReferencia === mesInicio && referencia.getDate() < inicio.getDate())) {
      anios--;
    }

    return Math.max(0, anios);
  }

  private calcularDiasVacacionesPorAnio(aniosTrabajados: number): number {
    return aniosTrabajados * 7;
  }

  private async calcularDiasTomados(empleadoId: number, anio: number): Promise<number> {
    try {
      const vacaciones = await this.vacacionesRepository
        .createQueryBuilder('vacacion')
        .where('vacacion.trabajador_id = :empleadoId', { empleadoId })
        .andWhere('YEAR(vacacion.fecha_inicio) = :anio', { anio })
        .getMany();

      return vacaciones.reduce((sum, vac) => sum + vac.dias_tomados, 0);
    } catch (error) {
      console.error('Error al calcular días tomados:', error.message);
      return 0;
    }
  }

  async calcularVacacionesDisponibles(dto: CalcularVacacionesDto) {
    const empleados = await this.trabajadorRepository.find({
      where: { estado: true },
    });

    const hoy = new Date();
    const vacacionesData = [];

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;

      const aniosTrabajados = this.calcularAniosTrabajados(emp.fecha_ingreso, hoy);
      if (aniosTrabajados < 1) continue;

      const diasTotalesAcumulados = this.calcularDiasVacacionesPorAnio(aniosTrabajados);
      const diasTomados = await this.calcularDiasTomados(emp.id, dto.anio);
      const diasDisponibles = diasTotalesAcumulados - diasTomados;

      const fechaIngresoDate = new Date(emp.fecha_ingreso);
      const proximaFechaCumpleAnio = new Date(
        hoy.getFullYear(),
        fechaIngresoDate.getMonth(),
        fechaIngresoDate.getDate()
      );

      if (proximaFechaCumpleAnio < hoy) {
        proximaFechaCumpleAnio.setFullYear(hoy.getFullYear() + 1);
      }

      const diasHastaVacaciones = aniosTrabajados === 0
        ? Math.ceil((proximaFechaCumpleAnio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      vacacionesData.push({
        id: emp.id,
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        cargo: emp.cargo,
        fechaIngreso: this.formatearFecha(emp.fecha_ingreso),
        aniosTrabajados,
        diasTotalesAcumulados,
        diasTomados,
        diasDisponibles,
        proximaFechaCumpleAnio: this.formatearFecha(proximaFechaCumpleAnio),
        diasHastaVacaciones,
      });
    }

    vacacionesData.sort((a, b) => b.diasDisponibles - a.diasDisponibles);

    return {
      vacaciones: vacacionesData,
      totalEmpleados: vacacionesData.length,
      empleadosConVacacionesPendientes: vacacionesData.filter(v => v.diasDisponibles > 0).length,
      anio: dto.anio,
    };
  }

  async registrarVacacion(dto: RegistrarVacacionDto): Promise<Vacacion> {
    const empleado = await this.trabajadorRepository.findOne({
      where: { id: dto.empleadoId },
    });

    if (!empleado) {
      throw new NotFoundException(`Empleado ${dto.empleadoId} no encontrado`);
    }

    if (!empleado.fecha_ingreso) {
      throw new BadRequestException('El empleado no tiene fecha de ingreso registrada');
    }

    const aniosTrabajados = this.calcularAniosTrabajados(empleado.fecha_ingreso);

    if (aniosTrabajados < 1) {
      const fechaPrimerAnio = new Date(empleado.fecha_ingreso);
      fechaPrimerAnio.setFullYear(fechaPrimerAnio.getFullYear() + 1);
      
      throw new BadRequestException(
        `El empleado aún no cumple el año de trabajo. Cumplirá el año el ${this.formatearFecha(fechaPrimerAnio)}`
      );
    }

    const fechaSalida = new Date(dto.fechaInicio);
    const fechaRegreso = new Date(dto.fechaFin);
    const diasSolicitados = Math.ceil((fechaRegreso.getTime() - fechaSalida.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diasSolicitados <= 0) {
      throw new BadRequestException('La fecha de regreso debe ser posterior a la fecha de salida');
    }

    const anioSolicitud = fechaSalida.getFullYear();
    const diasTotalesAcumulados = this.calcularDiasVacacionesPorAnio(aniosTrabajados);
    const diasTomados = await this.calcularDiasTomados(dto.empleadoId, anioSolicitud);
    const diasDisponibles = diasTotalesAcumulados - diasTomados;

    if (diasSolicitados > diasDisponibles) {
      throw new BadRequestException(
        `El empleado solo tiene ${diasDisponibles} días disponibles. Está solicitando ${diasSolicitados} días.`
      );
    }

    const usuario = await this.trabajadorRepository.findOne({
      where: { id: dto.userId },
    });

    const vacacion = this.vacacionesRepository.create({
      empleado,
      fecha_inicio: dto.fechaInicio,
      fecha_fin: dto.fechaFin,
      dias_tomados: diasSolicitados,
      observaciones: dto.observaciones,
      usuarioCrea: usuario,
      usuarioActualiza: usuario,
    });

    return await this.vacacionesRepository.save(vacacion);
  }

  async findAll(empleadoId?: number, anio?: number): Promise<Vacacion[]> {
    const query = this.vacacionesRepository.createQueryBuilder('vacacion')
      .leftJoinAndSelect('vacacion.empleado', 'empleado')
      .leftJoinAndSelect('vacacion.usuarioCrea', 'usuarioCrea')
      .leftJoinAndSelect('vacacion.usuarioActualiza', 'usuarioActualiza')
      .orderBy('vacacion.fecha_inicio', 'DESC');

    if (empleadoId) {
      query.andWhere('empleado.id = :empleadoId', { empleadoId });
    }

    if (anio) {
      query.andWhere('YEAR(vacacion.fecha_inicio) = :anio', { anio });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<Vacacion> {
    const vacacion = await this.vacacionesRepository.findOne({
      where: { id },
      relations: ['empleado'],
    });

    if (!vacacion) {
      throw new NotFoundException(`Vacación ${id} no encontrada`);
    }

    return vacacion;
  }

  async obtenerNotificacionesVacaciones() {
    const empleados = await this.trabajadorRepository.find({
      where: { estado: true },
    });

    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const notificaciones = [];

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;

      const aniosTrabajados = this.calcularAniosTrabajados(emp.fecha_ingreso, hoy);
      if (aniosTrabajados < 1) continue;

      const diasTotalesAcumulados = this.calcularDiasVacacionesPorAnio(aniosTrabajados);
      const diasTomados = await this.calcularDiasTomados(emp.id, anioActual);
      const diasDisponibles = diasTotalesAcumulados - diasTomados;

      if (diasDisponibles > 0) {
        notificaciones.push({
          empleadoId: emp.id,
          nombres: emp.nombres,
          apellidos: emp.apellidos,
          aniosTrabajados,
          diasDisponibles,
          diasTotalesAcumulados,
          diasTomados,
          fechaIngreso: this.formatearFecha(emp.fecha_ingreso),
        });
      }
    }

    return notificaciones.sort((a, b) => b.diasDisponibles - a.diasDisponibles);
  }

  async obtenerEmpleadosProximosPrimerAnio() {
    const empleados = await this.trabajadorRepository.find({
      where: { estado: true },
    });

    const hoy = new Date();
    const alertas = [];

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;

      const aniosTrabajados = this.calcularAniosTrabajados(emp.fecha_ingreso, hoy);
      if (aniosTrabajados >= 1) continue;

      const fechaIngresoDate = new Date(emp.fecha_ingreso);
      const fechaPrimerAnio = new Date(
        fechaIngresoDate.getFullYear() + 1,
        fechaIngresoDate.getMonth(),
        fechaIngresoDate.getDate()
      );

      const diasHastaPrimerAnio = Math.ceil((fechaPrimerAnio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diasHastaPrimerAnio <= 60) {
        alertas.push({
          empleadoId: emp.id,
          nombres: emp.nombres,
          apellidos: emp.apellidos,
          diasHastaPrimerAnio,
          fechaPrimerAnio: this.formatearFecha(fechaPrimerAnio),
          diasVacacionesQueGenerara: 7,
          tipo: 'proximo_primer_anio',
          mensaje: `Falta${diasHastaPrimerAnio === 1 ? '' : 'n'} ${diasHastaPrimerAnio} día${diasHastaPrimerAnio === 1 ? '' : 's'} para que cumpla su primer año y pueda solicitar vacaciones`
        });
      }
    }

    return alertas.sort((a, b) => a.diasHastaPrimerAnio - b.diasHastaPrimerAnio);
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