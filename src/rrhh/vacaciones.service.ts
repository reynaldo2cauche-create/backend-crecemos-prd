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

  /**
   * Calcula los años completos trabajados hasta una fecha dada
   */
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

  /**
   * Calcula los días de vacaciones correspondientes según años trabajados
   * Centro Crecemos: 7 días (1 semana) por cada año completo de servicios
   */
  private calcularDiasVacacionesPorAnio(aniosTrabajados: number): number {
    return aniosTrabajados * 7;
  }

  /**
   * Calcula cuántos días ya ha tomado el empleado
   */
  private async calcularDiasTomados(empleadoId: number, periodoAnio: number): Promise<number> {
    try {
      const vacaciones = await this.vacacionesRepository.find({
        where: {
          empleado: { id: empleadoId },
          periodoAnio: periodoAnio,
        },
      });

      return vacaciones.reduce((sum, vac) => sum + vac.diasTomados, 0);
    } catch (error) {
      console.error('Error al calcular días tomados:', error.message);
      return 0;
    }
  }

  /**
   * Calcula las vacaciones disponibles para todos los empleados activos
   */
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

  /**
   * Registra vacaciones (solo salida y regreso)
   */
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
      throw new BadRequestException(
        `El empleado aún no cumple el año de trabajo. Cumplirá el año el ${this.formatearFecha(
          new Date(new Date(empleado.fecha_ingreso).setFullYear(new Date(empleado.fecha_ingreso).getFullYear() + 1))
        )}`
      );
    }

    const fechaSalida = new Date(dto.fechaInicio);
    const fechaRegreso = new Date(dto.fechaFin);
    const diasSolicitados = Math.ceil((fechaRegreso.getTime() - fechaSalida.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diasSolicitados <= 0) {
      throw new BadRequestException('La fecha de regreso debe ser posterior a la fecha de salida');
    }

    const diasTotalesAcumulados = this.calcularDiasVacacionesPorAnio(aniosTrabajados);
    const diasTomados = await this.calcularDiasTomados(dto.empleadoId, dto.periodoAnio);
    const diasDisponibles = diasTotalesAcumulados - diasTomados;

    if (diasSolicitados > diasDisponibles) {
      throw new BadRequestException(
        `El empleado solo tiene ${diasDisponibles} días disponibles. Está solicitando ${diasSolicitados} días.`
      );
    }

    const vacacion = this.vacacionesRepository.create({
      empleado,
      fechaSalida: dto.fechaInicio,
      fechaRegreso: dto.fechaFin,
      diasTomados: diasSolicitados,
      periodoAnio: dto.periodoAnio,
      observaciones: dto.observaciones,
      userIdCrea: dto.userId, // ✅ Guardamos quién creó el registro
      userIdActua: dto.userId, // ✅ Guardamos quién actualizó el registro
    });

    return await this.vacacionesRepository.save(vacacion);
  }

  /**
   * Obtener todas las vacaciones con filtros opcionales
   */
  async findAll(empleadoId?: number, anio?: number): Promise<Vacacion[]> {
    const query = this.vacacionesRepository.createQueryBuilder('vacacion')
      .leftJoinAndSelect('vacacion.empleado', 'empleado')
      .orderBy('vacacion.fechaSalida', 'DESC');

    if (empleadoId) {
      query.andWhere('empleado.id = :empleadoId', { empleadoId });
    }

    if (anio) {
      query.andWhere('vacacion.periodoAnio = :anio', { anio });
    }

    return await query.getMany();
  }

  /**
   * Obtener una vacación por ID
   */
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

  /**
   * Eliminar una vacación
   */
  async remove(id: number): Promise<void> {
    const vacacion = await this.findOne(id);
    await this.vacacionesRepository.remove(vacacion);
  }

  /**
   * Obtener alertas de empleados con derecho a vacaciones (para registrar)
   */
  async obtenerNotificacionesVacaciones() {
    const empleados = await this.trabajadorRepository.find({
      where: { estado: true },
    });

    const hoy = new Date();
    const notificaciones = [];

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;

      const aniosTrabajados = this.calcularAniosTrabajados(emp.fecha_ingreso, hoy);

      // Solo empleados que ya tienen al menos 1 año
      if (aniosTrabajados < 1) continue;

      const diasTotalesAcumulados = this.calcularDiasVacacionesPorAnio(aniosTrabajados);
      const diasTomados = await this.calcularDiasTomados(emp.id, hoy.getFullYear());
      const diasDisponibles = diasTotalesAcumulados - diasTomados;

      // Solo notificar empleados con días disponibles
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

    // Ordenar por más días disponibles primero
    return notificaciones.sort((a, b) => b.diasDisponibles - a.diasDisponibles);
  }

  /**
   * Formatear fecha a string YYYY-MM-DD
   */
  private formatearFecha(fecha: Date | string): string {
    if (!fecha) return '';

    // Si ya es un string en formato correcto, devolverlo tal cual
    if (typeof fecha === 'string') {
      if (fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
        return fecha.split('T')[0]; // Quitar la parte de hora si existe
      }
    }

    // Si es un objeto Date
    if (fecha instanceof Date) {
      // Para fechas tipo DATE de MySQL (sin hora), usar métodos locales en lugar de UTC
      // porque MySQL devuelve solo la fecha sin zona horaria
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    // Si no es ni string ni Date, intentar convertir
    const date = new Date(fecha);
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

// Agrega este método para obtener empleados próximos a cumplir primer año
async obtenerEmpleadosProximosPrimerAnio() {
  const empleados = await this.trabajadorRepository.find({
    where: { estado: true },
  });

  const hoy = new Date();
  const alertas = [];

  for (const emp of empleados) {
    if (!emp.fecha_ingreso) continue;

    const aniosTrabajados = this.calcularAniosTrabajados(emp.fecha_ingreso, hoy);
    
    // Solo nos interesan los que aún no cumplen el primer año
    if (aniosTrabajados >= 1) continue;

    const fechaIngresoDate = new Date(emp.fecha_ingreso);
    
    // Calcular fecha del primer aniversario
    const fechaPrimerAnio = new Date(
      fechaIngresoDate.getFullYear() + 1,
      fechaIngresoDate.getMonth(),
      fechaIngresoDate.getDate()
    );

    const diasHastaPrimerAnio = Math.ceil((fechaPrimerAnio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // Alertar si faltan 60 días o menos para el primer aniversario
    if (diasHastaPrimerAnio <= 60) {
      const diasVacacionesQueGenerara = 7; // 7 días por el primer año

      alertas.push({
        empleadoId: emp.id,
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        diasHastaPrimerAnio,
        fechaPrimerAnio: this.formatearFecha(fechaPrimerAnio),
        diasVacacionesQueGenerara,
        tipo: 'proximo_primer_anio',
        mensaje: `Falta${diasHastaPrimerAnio === 1 ? '' : 'n'} ${diasHastaPrimerAnio} día${diasHastaPrimerAnio === 1 ? '' : 's'} para que cumpla su primer año y pueda solicitar vacaciones`
      });
    }
  }

  // Ordenar por días más próximos primero
  return alertas.sort((a, b) => a.diasHastaPrimerAnio - b.diasHastaPrimerAnio);
}
}
