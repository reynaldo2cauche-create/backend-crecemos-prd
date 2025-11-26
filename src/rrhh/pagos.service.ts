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

 private calcularMesesTrabajados(
    fechaIngreso: Date | string,
    periodoActual: 'julio' | 'diciembre',
    anioActual: number,
  ): number {
    const fechaInicio = new Date(fechaIngreso);
    const diaIngreso = fechaInicio.getDate();
    const mesIngresoEmpleado = fechaInicio.getMonth();
    const anioIngresoEmpleado = fechaInicio.getFullYear();

    // Determinar el rango del periodo (enero-junio o julio-diciembre)
    const mesInicioPeriodo = periodoActual === 'julio' ? 0 : 6; // enero=0, julio=6
    const mesFinPeriodo = periodoActual === 'julio' ? 5 : 11; // junio=5, diciembre=11

    // Gratificación se paga en la quincena (día 15) del mes de pago
    // Por ejemplo: gratificación de julio se paga el 15/julio
    // Entonces solo contamos hasta el MES ANTERIOR al de pago
    // - Julio: cuenta enero-junio (hasta mes 5, no cuenta julio/mes 6)
    // - Diciembre: cuenta julio-noviembre (hasta mes 10, no cuenta diciembre/mes 11)
    const mesLimiteParaContar = periodoActual === 'julio' ? 5 : 10; // junio=5, noviembre=10

    const inicioPeriodo = new Date(anioActual, mesInicioPeriodo, 1);
    const finPeriodo = new Date(anioActual, mesLimiteParaContar + 1, 0); // Último día del mes límite

    // Si ingresó después del periodo que se cuenta, no tiene derecho
    if (fechaInicio > finPeriodo) return 0;

    // Calcular meses trabajados dentro del periodo
    let mesesContados = 0;

    // Recorrer cada mes del periodo (solo hasta el mes límite, no el mes de pago)
    for (let mes = mesInicioPeriodo; mes <= mesLimiteParaContar; mes++) {
      // Si el empleado ingresó antes del inicio del periodo
      if (anioIngresoEmpleado < anioActual ||
          (anioIngresoEmpleado === anioActual && mesIngresoEmpleado < mesInicioPeriodo)) {
        // Tiene derecho a todos los meses del periodo
        mesesContados++;
        continue;
      }

      // Si el empleado ya trabajaba en este mes (ingresó en meses anteriores del periodo)
      if (anioIngresoEmpleado === anioActual && mesIngresoEmpleado < mes) {
        mesesContados++;
      }
      // Si ingresó en este mismo mes
      else if (anioIngresoEmpleado === anioActual && mesIngresoEmpleado === mes) {
        // Del 1 al 15: cuenta el mes completo
        if (diaIngreso <= 15) {
          mesesContados++;
        }
        // Del 16 en adelante: no cuenta este mes
      }
    }

    return mesesContados;
  }

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
          numero_cuenta: emp.numero_cuenta,
          banco: emp.banco,
          yaPagado,
          fechaPago: fechaPagoFormateada,
        };
      })
      .filter((g) => g.mesesTrabajados > 0);

    return {
      gratificaciones,
      totalGratificaciones: gratificaciones.reduce((sum, g) => sum + g.gratificacionProporcional, 0),
      totalSueldos: gratificaciones.reduce((sum, g) => sum + g.sueldoTotal, 0), // Total de todos los sueldos completos
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
    });

    if (!empleado) {
      throw new NotFoundException(`Trabajador ${dto.empleadoId} no encontrado`);
    }

    if (!empleado.numero_cuenta || !empleado.banco) {
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