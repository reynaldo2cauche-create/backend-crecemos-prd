// src/pagos/pagos.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from './pago.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { TipoSueldo } from './tipo-sueldo.entity';
import { Mes } from './mes.entity';
import { PeriodoGratificacion } from './periodo-gratificacion.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CalcularGratificacionesDto } from './dto/calcular-gratificaciones.dto';
import { RegistrarGratificacionDto } from './dto/registrar-gratificacion.dto';
import { RegistrarPagoMensualDto } from './dto/registrar-pago-mensual.dto';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private pagosRepository: Repository<Pago>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    @InjectRepository(TipoSueldo)
    private tipoSueldoRepository: Repository<TipoSueldo>,
    @InjectRepository(Mes)
    private mesRepository: Repository<Mes>,
    @InjectRepository(PeriodoGratificacion)
    private periodoGratificacionRepository: Repository<PeriodoGratificacion>,
  ) {}

  /**
   * Calcula los meses trabajados para gratificación según la ley peruana.
   *
   * REGLA SEGÚN LEY 27735 Y SUNAFIL:
   * - Se consideran SOLO los MESES CALENDARIO COMPLETOS trabajados
   * - Un mes es "completo" cuando el trabajador laboró TODO el mes calendario
   * - Si ingresó durante el mes (cualquier día del 2 al último día), ese mes NO cuenta
   * - Solo cuenta si ingresó el DÍA 1 del mes
   *
   * EJEMPLOS:
   * - Ingresó 01/01/2023 → Enero CUENTA ✅
   * - Ingresó 13/01/2023 → Enero NO CUENTA ❌ (no trabajó del 1-12)
   * - Ingresó 15/02/2023 → Febrero NO CUENTA ❌ (no trabajó del 1-14)
   *
   * PERIODOS:
   * - JULIO 2025: Evalúa Enero-Junio 2025 (6 meses posibles)
   * - DICIEMBRE 2025: Evalúa Julio-Noviembre 2025 (5 meses, Junio ya contó en Julio)
   */
  private calcularMesesTrabajados(
    fechaIngreso: Date | string,
    periodoActual: 'julio' | 'diciembre',
    anioActual: number,
  ): number {
    const fechaInicio = new Date(fechaIngreso);

    // ✅ USAR UTC PARA EVITAR PROBLEMAS DE TIMEZONE
    const diaIngreso = fechaInicio.getUTCDate();
    const mesIngresoEmpleado = fechaInicio.getUTCMonth(); // 0 = enero, 11 = diciembre
    const anioIngresoEmpleado = fechaInicio.getUTCFullYear();

    // Determinar qué meses evaluar según el periodo
    let mesesAEvaluar: number[] = [];

    if (periodoActual === 'julio') {
      // JULIO evalúa: Enero (0) a Junio (5) = 6 meses
      mesesAEvaluar = [0, 1, 2, 3, 4, 5];
    } else {
      // DICIEMBRE evalúa: Julio (6) a Noviembre (10) = 5 meses
      mesesAEvaluar = [6, 7, 8, 9, 10];
    }

    let mesesContados = 0;

    // Evaluar cada mes del periodo
    for (const mes of mesesAEvaluar) {
      // CASO 1: El empleado ingresó ANTES del año actual
      if (anioIngresoEmpleado < anioActual) {
        mesesContados++;
        continue;
      }

      // CASO 2: El empleado ingresó en el año actual
      if (anioIngresoEmpleado === anioActual) {

        // Si ingresó ANTES de este mes → el mes CUENTA
        if (mesIngresoEmpleado < mes) {
          mesesContados++;
        }
        // Si ingresó en ESTE MISMO MES → verificar el día
        else if (mesIngresoEmpleado === mes) {
          // Solo cuenta si ingresó el DÍA 1 del mes
          if (diaIngreso === 1) {
            mesesContados++;
          }
        }
      }
    }

    return mesesContados;
  }

  /**
   * Calcula la gratificación según la ley peruana.
   *
   * FÓRMULA:
   * - Gratificación Completa = 25% del sueldo base
   * - Gratificación Proporcional = (Gratificación Completa × Meses Trabajados) / 6
   *
   * NOTAS:
   * - Siempre se divide entre 6, incluso en diciembre (5 meses)
   * - SUNAFIL lo interpreta así: se "completa" el cálculo sobre 6 meses
   */
  private calcularGratificacion(sueldoBase: number, meses: number) {
    // Redondear a exactamente 2 decimales usando toFixed
    const completa = parseFloat((sueldoBase * 0.25).toFixed(2));
    const proporcional = parseFloat(((completa * meses) / 6).toFixed(2));

    return {
      completa,
      proporcional,
    };
  }

  async calcularGratificaciones(dto: CalcularGratificacionesDto) {
    const empleados = await this.trabajadorRepository.find({
      where: { estado: true },
      relations: ['cuentas_bancarias'],
    });

    // Buscar el tipo de sueldo "CON_GRATIFICACION"
    const tipoConGratificacion = await this.tipoSueldoRepository.findOne({
      where: { codigo: 'CON_GRATIFICACION' },
    });

    // Buscar el periodo de gratificación
    const periodoGratificacion = await this.periodoGratificacionRepository.findOne({
      where: {
        mes_gratificacion: dto.periodo.toUpperCase() as 'JULIO' | 'DICIEMBRE',
        anio: dto.anio,
      },
    });

    // Verificar pagos ya realizados para este periodo
    const pagosExistentes = await this.pagosRepository.find({
      where: {
        tipo_sueldo: { codigo: 'CON_GRATIFICACION' },
        anio: dto.anio,
        periodo_gratificacion: periodoGratificacion ? { id: periodoGratificacion.id } : null,
      },
      relations: ['empleado', 'tipo_sueldo', 'mes', 'periodo_gratificacion'],
    });

    // Crear un mapa de empleados que ya tienen pago
    const empleadosPagados = new Map(
      pagosExistentes.map(pago => [pago.empleado.id, pago])
    );

    const gratificaciones = empleados
      .filter((emp) => emp.sueldo_base && emp.fecha_ingreso)
      .map((emp) => {
        const mesesTrabajados = this.calcularMesesTrabajados(
          emp.fecha_ingreso,
          dto.periodo,
          dto.anio,
        );
        const sueldoBase = Number(emp.sueldo_base);
        const { completa, proporcional } = this.calcularGratificacion(sueldoBase, mesesTrabajados);

        // Calcular el sueldo total (base + gratificación proporcional)
        const sueldoTotal = sueldoBase + proporcional;

        // Formatear fecha correctamente sin problemas de timezone
        let fechaFormateada: string;

        if (emp.fecha_ingreso instanceof Date) {
          const anio = emp.fecha_ingreso.getFullYear();
          const mes = String(emp.fecha_ingreso.getMonth() + 1).padStart(2, '0');
          const dia = String(emp.fecha_ingreso.getDate()).padStart(2, '0');
          fechaFormateada = `${anio}-${mes}-${dia}`;
        } else {
          fechaFormateada = String(emp.fecha_ingreso).split('T')[0];
        }

        // Verificar si ya fue pagado
        const pagoExistente = empleadosPagados.get(emp.id);
        const yaPagado = !!pagoExistente;

        // Formatear fecha de pago si existe
        let fechaPagoFormateada = null;
        if (pagoExistente && pagoExistente.fecha_pago) {
          if (pagoExistente.fecha_pago instanceof Date) {
            const anioPago = pagoExistente.fecha_pago.getFullYear();
            const mesPago = String(pagoExistente.fecha_pago.getMonth() + 1).padStart(2, '0');
            const diaPago = String(pagoExistente.fecha_pago.getDate()).padStart(2, '0');
            fechaPagoFormateada = `${anioPago}-${mesPago}-${diaPago}`;
          } else {
            fechaPagoFormateada = String(pagoExistente.fecha_pago).split('T')[0];
          }
        }

        // Buscar cuenta bancaria principal
        const cuentaPrincipal = emp.cuentas_bancarias?.find(c => c.es_principal) || emp.cuentas_bancarias?.[0];

        return {
          id: emp.id,
          nombres: emp.nombres,
          apellidos: emp.apellidos,
          cargo: emp.cargo,
          sueldoBase,
          fecha_ingreso: fechaFormateada,
          mesesTrabajados,
          gratificacionCompleta: completa,
          gratificacionProporcional: proporcional,
          sueldoTotal,
          numero_cuenta: cuentaPrincipal?.numero_cuenta || emp.numero_cuenta || null,
          banco: cuentaPrincipal?.banco || emp.banco || null,
          yaPagado,
          fechaPago: fechaPagoFormateada,
        };
      })
      .filter((g) => g.mesesTrabajados > 0);

    return {
      gratificaciones,
      totalGratificaciones: gratificaciones.reduce((sum, g) => sum + g.gratificacionProporcional, 0),
      totalSueldos: gratificaciones.reduce((sum, g) => sum + g.sueldoTotal, 0),
      empleadosConDerecho: gratificaciones.length,
      empleadosPagados: gratificaciones.filter(g => g.yaPagado).length,
      empleadosPendientes: gratificaciones.filter(g => !g.yaPagado).length,
      periodo: dto.periodo,
      anio: dto.anio,
    };
  }

  async registrarGratificacion(dto: RegistrarGratificacionDto): Promise<Pago> {
    const empleado = await this.trabajadorRepository.findOne({
      where: { id: dto.empleadoId },
      relations: ['cuentas_bancarias'],
    });

    if (!empleado) {
      throw new NotFoundException(`Trabajador ${dto.empleadoId} no encontrado`);
    }

    // Verificar datos bancarios
    const cuentaPrincipal = empleado.cuentas_bancarias?.find(c => c.es_principal) || empleado.cuentas_bancarias?.[0];
    const tieneDatosBancarios = (cuentaPrincipal?.numero_cuenta && cuentaPrincipal?.banco) ||
                                (empleado.numero_cuenta && empleado.banco);

    if (!tieneDatosBancarios) {
      throw new BadRequestException('El empleado no tiene datos bancarios');
    }

    if (dto.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Extraer mes y año del periodo (ej: "julio-2025" o "diciembre-2025")
    const [mesString, anioStr] = dto.periodo.split('-');
    const anio = parseInt(anioStr);

    // Buscar tipo de sueldo "CON_GRATIFICACION"
    const tipoSueldo = await this.tipoSueldoRepository.findOne({
      where: { codigo: 'CON_GRATIFICACION' },
    });

    if (!tipoSueldo) {
      throw new NotFoundException('Tipo de sueldo CON_GRATIFICACION no encontrado');
    }

    // Buscar el mes correspondiente (julio=7, diciembre=12)
    const mesId = mesString.toLowerCase() === 'julio' ? 7 : 12;
    const mes = await this.mesRepository.findOne({
      where: { id: mesId },
    });

    if (!mes) {
      throw new NotFoundException(`Mes ${mesString} no encontrado`);
    }

    // Buscar el periodo de gratificación
    const periodoGratificacion = await this.periodoGratificacionRepository.findOne({
      where: {
        mes_gratificacion: mesString.toUpperCase() as 'JULIO' | 'DICIEMBRE',
        anio: anio,
      },
    });

    if (!periodoGratificacion) {
      throw new NotFoundException(`Periodo de gratificación ${mesString} ${anio} no encontrado`);
    }

    // Verificar si ya existe un pago para este empleado en este periodo
    const pagoExistente = await this.pagosRepository.findOne({
      where: {
        empleado: { id: dto.empleadoId },
        tipo_sueldo: { codigo: 'CON_GRATIFICACION' },
        anio: anio,
        periodo_gratificacion: { id: periodoGratificacion.id },
      },
      relations: ['empleado', 'periodo_gratificacion'],
    });

    if (pagoExistente) {
      let fechaFormateada: string;

      if (pagoExistente.fecha_pago instanceof Date) {
        fechaFormateada = `${pagoExistente.fecha_pago.getDate()}/${pagoExistente.fecha_pago.getMonth() + 1}/${pagoExistente.fecha_pago.getFullYear()}`;
      } else {
        const partes = String(pagoExistente.fecha_pago).split('T')[0].split('-');
        fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }

      throw new BadRequestException(
        `Ya existe un pago de gratificación registrado para ${empleado.nombres} ${empleado.apellidos} en el periodo ${mesString} ${anio}. Fecha de pago: ${fechaFormateada}`
      );
    }

    // Formatear fecha actual
    const hoy = new Date();
    const fechaPago = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Calcular monto total: Sueldo Base + Gratificación
    const sueldoBase = Number(empleado.sueldo_base);
    const gratificacion = Number(dto.monto);
    const montoTotal = sueldoBase + gratificacion;

    // Buscar el usuario que registra
    const usuario = await this.trabajadorRepository.findOne({
      where: { id: dto.userId },
    });

    // Crear el pago
    const pago = this.pagosRepository.create({
      empleado,
      tipo_sueldo: tipoSueldo,
      mes: mes,
      anio: anio,
      periodo_gratificacion: periodoGratificacion,
      monto: montoTotal,
      monto_sueldo: sueldoBase,
      monto_gratificacion: gratificacion,
      fecha_pago: fechaPago,
      usuarioCrea: usuario,
      usuarioActualiza: usuario,
    });

    return await this.pagosRepository.save(pago);
  }

  async registrarPagoMensual(dto: RegistrarPagoMensualDto): Promise<Pago> {
    const empleado = await this.trabajadorRepository.findOne({
      where: { id: dto.empleadoId },
    });

    if (!empleado) {
      throw new NotFoundException(`Trabajador ${dto.empleadoId} no encontrado`);
    }

    if (dto.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Buscar tipo de sueldo "REGULAR"
    const tipoSueldo = await this.tipoSueldoRepository.findOne({
      where: { codigo: 'REGULAR' },
    });

    if (!tipoSueldo) {
      throw new NotFoundException('Tipo de sueldo REGULAR no encontrado');
    }

    // Buscar el mes por ID
    const mes = await this.mesRepository.findOne({
      where: { id: dto.mesId },
    });

    if (!mes) {
      throw new NotFoundException(`Mes con ID ${dto.mesId} no encontrado`);
    }

    // Verificar si ya existe un pago para este mes y año
    const pagoExistente = await this.pagosRepository.findOne({
      where: {
        empleado: { id: dto.empleadoId },
        tipo_sueldo: { codigo: 'REGULAR' },
        mes: { id: dto.mesId },
        anio: dto.anio,
      },
      relations: ['empleado', 'mes'],
    });

    if (pagoExistente) {
      let fechaFormateada: string;

      if (pagoExistente.fecha_pago instanceof Date) {
        fechaFormateada = `${pagoExistente.fecha_pago.getDate()}/${pagoExistente.fecha_pago.getMonth() + 1}/${pagoExistente.fecha_pago.getFullYear()}`;
      } else {
        const partes = String(pagoExistente.fecha_pago).split('T')[0].split('-');
        fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }

      throw new BadRequestException(
        `Ya existe un pago de sueldo registrado para ${empleado.nombres} ${empleado.apellidos} en ${mes.nombre} ${dto.anio}. Fecha de pago: ${fechaFormateada}`
      );
    }

    // Buscar el usuario que registra
    const usuario = await this.trabajadorRepository.findOne({
      where: { id: dto.userId },
    });

    const pago = this.pagosRepository.create({
      empleado,
      tipo_sueldo: tipoSueldo,
      mes: mes,
      anio: dto.anio,
      periodo_gratificacion: null,
      monto: dto.monto,
      monto_sueldo: dto.monto,
      monto_gratificacion: null,
      fecha_pago: dto.fechaPago,
      usuarioCrea: usuario,
      usuarioActualiza: usuario,
    });

    return await this.pagosRepository.save(pago);
  }

  async create(createPagoDto: CreatePagoDto): Promise<Pago> {
    const empleado = await this.trabajadorRepository.findOne({
      where: { id: createPagoDto.empleadoId },
    });

    if (!empleado) {
      throw new NotFoundException(`Trabajador ${createPagoDto.empleadoId} no encontrado`);
    }

    const pago = this.pagosRepository.create({
      ...createPagoDto,
      empleado,
    });

    return await this.pagosRepository.save(pago);
  }

  async findAll(tipo?: string, periodo?: string, anio?: number): Promise<Pago[]> {
    const query = this.pagosRepository.createQueryBuilder('pago')
      .leftJoinAndSelect('pago.empleado', 'empleado')
      .leftJoinAndSelect('pago.tipo_sueldo', 'tipo_sueldo')
      .leftJoinAndSelect('pago.mes', 'mes')
      .leftJoinAndSelect('pago.periodo_gratificacion', 'periodo_gratificacion')
      .leftJoinAndSelect('pago.usuarioCrea', 'usuarioCrea')
      .leftJoinAndSelect('pago.usuarioActualiza', 'usuarioActualiza')
      .orderBy('pago.fecha_pago', 'DESC');

    if (tipo) {
      query.andWhere('tipo_sueldo.codigo = :tipo', { tipo });
    }
    if (periodo && periodo !== 'todos') {
      // Periodo ahora es un ID de mes (1-12)
      const mesId = parseInt(periodo);
      if (!isNaN(mesId)) {
        query.andWhere('pago.mes_id = :mesId', { mesId });
      }
    }
    if (anio) {
      query.andWhere('pago.anio = :anio', { anio });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<Pago> {
    const pago = await this.pagosRepository.findOne({
      where: { id },
      relations: ['empleado', 'tipo_sueldo', 'mes', 'periodo_gratificacion'],
    });

    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    return pago;
  }

  async remove(id: number): Promise<void> {
    const pago = await this.findOne(id);
    await this.pagosRepository.remove(pago);
  }
}
