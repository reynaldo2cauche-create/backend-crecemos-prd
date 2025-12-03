// src/pagos/pagos.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from './pago.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
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
      relations: ['cuentas_bancarias'], // ✅ Cargar cuentas bancarias
    });

    // Verificar pagos ya realizados para este periodo
    const periodoCompleto = `${dto.periodo}-${dto.anio}`;
    const pagosExistentes = await this.pagosRepository.find({
      where: {
        tipo: 'sueldo_con_gratificacion',
        periodo: periodoCompleto,
      },
      relations: ['empleado'],
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
          // Si es un objeto Date, extraer componentes en hora local
          const anio = emp.fecha_ingreso.getFullYear();
          const mes = String(emp.fecha_ingreso.getMonth() + 1).padStart(2, '0');
          const dia = String(emp.fecha_ingreso.getDate()).padStart(2, '0');
          fechaFormateada = `${anio}-${mes}-${dia}`;
        } else {
          // Si es string o cualquier otro tipo, convertir a string y extraer
          fechaFormateada = String(emp.fecha_ingreso).split('T')[0];
        }

        // Verificar si ya fue pagado
        const pagoExistente = empleadosPagados.get(emp.id);
        const yaPagado = !!pagoExistente;

        // Formatear fecha de pago si existe
        let fechaPagoFormateada = null;
        if (pagoExistente && pagoExistente.fechaPago) {
          if (pagoExistente.fechaPago instanceof Date) {
            // Si es un objeto Date, extraer componentes en hora local
            const anioPago = pagoExistente.fechaPago.getFullYear();
            const mesPago = String(pagoExistente.fechaPago.getMonth() + 1).padStart(2, '0');
            const diaPago = String(pagoExistente.fechaPago.getDate()).padStart(2, '0');
            fechaPagoFormateada = `${anioPago}-${mesPago}-${diaPago}`;
          } else {
            // Si es string o cualquier otro tipo
            fechaPagoFormateada = String(pagoExistente.fechaPago).split('T')[0];
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
          sueldoTotal, // Sueldo base + gratificación
          numero_cuenta: cuentaPrincipal?.numero_cuenta || emp.numero_cuenta || null, // ✅ Usar cuenta bancaria separada
          banco: cuentaPrincipal?.banco || emp.banco || null, // ✅ Usar cuenta bancaria separada
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
      relations: ['cuentas_bancarias'], // ✅ Cargar cuentas bancarias
    });

    if (!empleado) {
      throw new NotFoundException(`Trabajador ${dto.empleadoId} no encontrado`);
    }

    // ✅ Verificar datos bancarios en tabla separada o campos antiguos
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
    const [mes, anioStr] = dto.periodo.split('-');
    const anio = parseInt(anioStr);

    // Verificar si ya existe un pago de gratificación para este empleado en este periodo
    const pagoExistente = await this.pagosRepository.findOne({
      where: {
        empleado: { id: dto.empleadoId },
        tipo: 'sueldo_con_gratificacion',
        periodo: dto.periodo,
      },
    });

    if (pagoExistente) {
      // Formatear fecha del pago existente sin problemas de timezone
      let fechaFormateada: string;

      if (pagoExistente.fechaPago instanceof Date) {
        fechaFormateada = `${pagoExistente.fechaPago.getDate()}/${pagoExistente.fechaPago.getMonth() + 1}/${pagoExistente.fechaPago.getFullYear()}`;
      } else {
        const partes = String(pagoExistente.fechaPago).split('T')[0].split('-');
        fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }

      throw new BadRequestException(
        `Ya existe un pago de gratificación registrado para ${empleado.nombres} ${empleado.apellidos} en el periodo ${mes} ${anio}. Fecha de pago: ${fechaFormateada}`
      );
    }

    // Formatear fecha actual sin problemas de timezone
    const hoy = new Date();
    const fechaPago = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Calcular monto total: Sueldo Base + Gratificación
    const sueldoBase = Number(empleado.sueldo_base);
    const gratificacion = Number(dto.monto);
    const montoTotal = sueldoBase + gratificacion;

    // Registrar UN SOLO PAGO con el desglose
    const pago = this.pagosRepository.create({
      empleado,
      tipo: 'sueldo_con_gratificacion',
      monto: montoTotal, // Monto total
      montoSueldo: sueldoBase, // Desglose: sueldo base
      montoGratificacion: gratificacion, // Desglose: gratificación
      periodo: dto.periodo,
      mes: mes,
      anio: anio,
      fechaPago: fechaPago,
      userIdCrea: dto.userId, // ✅ Guardamos quién creó el pago
      userIdActua: dto.userId, // ✅ Guardamos quién actualizó el pago
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

    // Verificar si ya existe un pago para este mes y año
    const pagoExistente = await this.pagosRepository.findOne({
      where: {
        empleado: { id: dto.empleadoId },
        tipo: 'sueldo',
        mes: dto.mes,
        anio: dto.anio,
      },
    });

    if (pagoExistente) {
      // Formatear fecha del pago existente sin problemas de timezone
      let fechaFormateada: string;

      if (pagoExistente.fechaPago instanceof Date) {
        fechaFormateada = `${pagoExistente.fechaPago.getDate()}/${pagoExistente.fechaPago.getMonth() + 1}/${pagoExistente.fechaPago.getFullYear()}`;
      } else {
        const partes = String(pagoExistente.fechaPago).split('T')[0].split('-');
        fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }

      throw new BadRequestException(
        `Ya existe un pago de sueldo registrado para ${empleado.nombres} ${empleado.apellidos} en ${dto.mes} ${dto.anio}. Fecha de pago: ${fechaFormateada}`
      );
    }

    const pago = this.pagosRepository.create({
      empleado,
      tipo: 'sueldo',
      monto: dto.monto,
      mes: dto.mes,
      anio: dto.anio,
      periodo: `${dto.mes}-${dto.anio}`,
      fechaPago: dto.fechaPago,
      userIdCrea: dto.userId, // ✅ Guardamos quién creó el pago
      userIdActua: dto.userId, // ✅ Guardamos quién actualizó el pago
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
      .orderBy('pago.fechaPago', 'DESC');

    if (tipo) query.andWhere('pago.tipo = :tipo', { tipo });
    if (periodo && periodo !== 'todos') {
      query.andWhere('pago.mes = :periodo', { periodo });
    }
    if (anio) query.andWhere('YEAR(pago.fechaPago) = :anio', { anio });

    return await query.getMany();
  }

  async findOne(id: number): Promise<Pago> {
    const pago = await this.pagosRepository.findOne({
      where: { id },
      relations: ['empleado'],
    });

    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    return pago;
  }

  async remove(id: number): Promise<void> {
    const pago = await this.findOne(id);
    await this.pagosRepository.remove(pago);
  }
}