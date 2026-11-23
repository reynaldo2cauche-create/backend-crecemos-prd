import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeneficiosConfig } from './entities/beneficios-config.entity';
import { BeneficiosConfigHistorial } from './entities/beneficios-config-historial.entity';
import { PacienteBeneficios } from './entities/paciente-beneficios.entity';
import { PuntosMovimiento } from './entities/puntos-movimiento.entity';
import { Producto } from '../inventario/entities/producto.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MoreThan, MoreThanOrEqual } from 'typeorm';

// El programa arranca el 01/12/2026; no se otorgan puntos por pagos anteriores.
const FECHA_INICIO_PROGRAMA = new Date('2026-12-01T00:00:00');
export type OrigenPagoPuntos = 'VENTA_SERVICIO_PAGO' | 'VENTA_PRODUCTO_PAGO';
export interface ResumenPuntos {
  saldo: number;
  historico: number;
  fraccion: number;
  proximoVencimiento: { puntos: number; fecha: string } | null;
  movimientos: PuntosMovimiento[];
}

@Injectable()
export class BeneficiosService {
  constructor(
    @InjectRepository(BeneficiosConfig)
    private readonly configRepo: Repository<BeneficiosConfig>,
    @InjectRepository(BeneficiosConfigHistorial)
    private readonly historialRepo: Repository<BeneficiosConfigHistorial>,
    @InjectRepository(PacienteBeneficios)
    private readonly pbRepo: Repository<PacienteBeneficios>,
    @InjectRepository(PuntosMovimiento)
    private readonly movRepo: Repository<PuntosMovimiento>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /** Puntos de canje = CEIL( (precio_venta / (%/100)) / 100 ) * 100. */
  calcularPuntosNecesarios(precioVenta: number, porcentaje: number): number {
    const pv = Number(precioVenta);
    const pct = Number(porcentaje);
    if (!pv || !pct) return 0;
    const base = pv / (pct / 100); // = pv * 100 / pct
    return Math.ceil(base / 100) * 100;
  }

  // ───────────── CONFIG ─────────────

  async getConfig(): Promise<BeneficiosConfig> {
    let cfg = await this.configRepo.findOne({ where: { id: 1 } });
    if (!cfg) {
      cfg = await this.configRepo.save(this.configRepo.create({ id: 1, porcentaje_recompensa: 1, activo: 1 }));
    }
    return cfg;
  }

  async actualizarConfig(porcentaje: number, userId?: number, motivo?: string): Promise<BeneficiosConfig> {
    if (!porcentaje || porcentaje <= 0) {
      throw new BadRequestException('El porcentaje de recompensa debe ser mayor a 0');
    }
    const cfg = await this.getConfig();
    const anterior = Number(cfg.porcentaje_recompensa);

    cfg.porcentaje_recompensa = porcentaje;
    cfg.user_actua_id = userId ?? null;
    const guardado = await this.configRepo.save(cfg);

    await this.historialRepo.save(this.historialRepo.create({
      porcentaje_anterior: anterior,
      porcentaje_nuevo: porcentaje,
      motivo: motivo ?? null,
      user_crea_id: userId ?? null,
    }));

    if (userId) {
      await this.auditoriaService.registrar({
        trabajadorId: userId,
        accion: 'CAMBIAR_PORCENTAJE_BENEFICIOS',
        modulo: 'BENEFICIOS',
        descripcion: `Cambio el porcentaje de recompensa de ${anterior}% a ${porcentaje}%${motivo ? ` - ${motivo}` : ''}`,
        datosNuevos: { porcentaje_anterior: anterior, porcentaje_nuevo: porcentaje },
      });
    }

    return guardado;
  }

  // ───────────── CATÁLOGO DE PREMIOS (productos canjeables) ─────────────

  async listarPremios(busqueda?: string): Promise<Producto[]> {
    const qb = this.productoRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'categoria')
      .where('p.es_canjeable = 1')
      .orderBy('p.nombre', 'ASC');
    if (busqueda && busqueda.trim()) {
      qb.andWhere('p.nombre LIKE :q', { q: `%${busqueda.trim()}%` });
    }
    return qb.getMany();
  }

  /**
   * Crea o edita un producto canjeable (catálogo de premios).
   * Si no manda puntos_necesarios manuales, se calculan con el % (propio o global).
   */
  async guardarPremio(dto: any, userId?: number): Promise<Producto> {
    const cfg = await this.getConfig();
    const porcentaje = dto.porcentaje_recompensa != null
      ? Number(dto.porcentaje_recompensa)
      : Number(cfg.porcentaje_recompensa);

    const esManual = Boolean(dto.puntos_manual);
    const puntos = esManual && dto.puntos_necesarios != null
      ? Math.ceil(Number(dto.puntos_necesarios) / 100) * 100
      : this.calcularPuntosNecesarios(dto.precio_venta, porcentaje);

    let producto: Producto;
    if (dto.id) {
      producto = await this.productoRepo.findOne({ where: { id: dto.id } });
      if (!producto) throw new NotFoundException(`Producto ${dto.id} no encontrado`);
    } else {
      producto = this.productoRepo.create({ user_crea_id: userId ?? null });
    }

    // Campos de inventario (reusa la misma tabla producto)
    if (dto.nombre != null) producto.nombre = dto.nombre;
    if (dto.descripcion != null) producto.descripcion = dto.descripcion;
    if (dto.categoria_id != null) producto.categoria_id = Number(dto.categoria_id);
    if (dto.precio_venta != null) producto.precio_venta = Number(dto.precio_venta);
    if (dto.precio_compra != null) producto.precio_compra = Number(dto.precio_compra);
    if (dto.stock_actual != null) producto.stock_actual = Number(dto.stock_actual);
    if (dto.imagen_url != null) producto.imagen_url = dto.imagen_url;
    if (dto.codigo != null) producto.codigo = dto.codigo;
    // Disponible = flg_activo (toggle del formulario)
    if (dto.disponible != null) producto.flg_activo = dto.disponible ? 1 : 0;

    // Lealtad
    producto.es_canjeable = 1;
    producto.porcentaje_recompensa = dto.porcentaje_recompensa != null ? Number(dto.porcentaje_recompensa) : null;
    producto.puntos_necesarios = puntos;
    producto.puntos_manual = esManual ? 1 : 0;
    producto.user_actua_id = userId ?? null;

    const guardado = await this.productoRepo.save(producto);

    if (userId) {
      await this.auditoriaService.registrar({
        trabajadorId: userId,
        accion: dto.id ? 'EDITAR_PREMIO' : 'CREAR_PREMIO',
        modulo: 'BENEFICIOS',
        descripcion: `${dto.id ? 'Edito' : 'Registro'} el premio "${guardado.nombre}" (${puntos} puntos)${esManual ? ' [puntaje manual]' : ''}`,
        datosNuevos: { producto_id: guardado.id, precio_venta: guardado.precio_venta, puntos_necesarios: puntos, porcentaje },
      });
    }

    return guardado;
  }

  // ───────────── ACUMULACIÓN / REVERSIÓN (ledger FIFO) ─────────────

  private fechaStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private async getOrCreatePB(pacienteId: number): Promise<PacienteBeneficios> {
    let pb = await this.pbRepo.findOne({ where: { paciente_id: pacienteId } });
    if (!pb) {
      pb = this.pbRepo.create({ paciente_id: pacienteId, saldo_puntos: 0, puntos_historicos: 0, fraccion_acumulada: 0 });
      pb = await this.pbRepo.save(pb);
    }
    return pb;
  }

  /**
   * Acumula puntos al validar un pago. 1 punto por S/1 (la fracción < S/1 se
   * guarda para el próximo pago). Solo pagos desde 01/12/2026. Idempotente por pago.
   */


    async acumularPorPago(
      pacienteId: number,
      monto: number,
      origenPagoId: number,
      origenTipo: OrigenPagoPuntos,
      fechaPago?: Date | string | null,
      userId?: number,
    ): Promise<void> {
      if (!pacienteId || !monto || Number(monto) <= 0) return;

      const fecha = fechaPago ? new Date(fechaPago) : new Date();
      if (fecha < FECHA_INICIO_PROGRAMA) return;

      // Idempotencia: no acumular dos veces el mismo pago
      const yaExiste = await this.movRepo.findOne({
        where: { origen_tipo: origenTipo, origen_id: origenPagoId, tipo: 'ACUMULACION' },
      });
      if (yaExiste) return;

      const pb = await this.getOrCreatePB(pacienteId);
      const total = Number(pb.fraccion_acumulada) + Number(monto);
      const puntos = Math.floor(total);

      if (puntos > 0) {
        const venc = new Date();
        venc.setMonth(venc.getMonth() + 12);
        await this.movRepo.save(this.movRepo.create({
          paciente_id: pacienteId,
          tipo: 'ACUMULACION',
          puntos,
          saldo_restante: puntos,
          fecha_vencimiento: this.fechaStr(venc),
          origen_tipo: origenTipo,
          origen_id: origenPagoId,
          descripcion: `Acumulación por pago validado #${origenPagoId} (${origenTipo === 'VENTA_SERVICIO_PAGO' ? 'servicio' : 'producto'})`,
          user_crea_id: userId ?? null,
        }));
        pb.saldo_puntos = Number(pb.saldo_puntos) + puntos;
        pb.puntos_historicos = Number(pb.puntos_historicos) + puntos;
      }
      pb.fraccion_acumulada = Number((total - puntos).toFixed(2));
      await this.pbRepo.save(pb);
    }

  /**
   * Revierte puntos por una devolución / nota de crédito. Quita hasta
   * floor(montoDevuelto) puntos de los lotes vivos (FIFO). El saldo no baja de 0.
   */
  async revertirPorDevolucion(
    pacienteId: number,
    montoDevuelto: number,
    ventaId: number,
    userId?: number,
  ): Promise<void> {
    if (!pacienteId || !montoDevuelto || Number(montoDevuelto) <= 0) return;

    let aRevertir = Math.floor(Number(montoDevuelto));
    if (aRevertir <= 0) return;

    const lotes = await this.movRepo.find({
      where: { paciente_id: pacienteId, tipo: 'ACUMULACION' },
      order: { fecha_generacion: 'ASC', id: 'ASC' },
    });

    let removido = 0;
    for (const lote of lotes) {
      if (aRevertir <= 0) break;
      const disp = lote.saldo_restante ?? 0;
      if (disp <= 0) continue;
      const quita = Math.min(disp, aRevertir);
      lote.saldo_restante = disp - quita;
      await this.movRepo.save(lote);
      aRevertir -= quita;
      removido += quita;
    }

    if (removido > 0) {
      await this.movRepo.save(this.movRepo.create({
        paciente_id: pacienteId,
        tipo: 'REVERSION',
        puntos: -removido,
        saldo_restante: null,
        origen_tipo: 'NC',
        origen_id: ventaId,
        descripcion: `Reversión por devolución (venta #${ventaId})`,
        user_crea_id: userId ?? null,
      }));
      const pb = await this.getOrCreatePB(pacienteId);
      pb.saldo_puntos = Math.max(0, Number(pb.saldo_puntos) - removido);
      await this.pbRepo.save(pb);
    }
  }

  /** Saldo de puntos vigentes del paciente (derivado de lotes no vencidos). */
  async getSaldo(pacienteId: number): Promise<{ saldo: number; historico: number; fraccion: number }> {
    const pb = await this.pbRepo.findOne({ where: { paciente_id: pacienteId } });
    return {
      saldo: pb ? Number(pb.saldo_puntos) : 0,
      historico: pb ? Number(pb.puntos_historicos) : 0,
      fraccion: pb ? Number(pb.fraccion_acumulada) : 0,
    };
  }

  /** Quita un producto del catálogo de premios (no lo borra del inventario). */
  async quitarPremio(id: number, userId?: number): Promise<void> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    producto.es_canjeable = 0;
    producto.user_actua_id = userId ?? null;
    await this.productoRepo.save(producto);
    if (userId) {
      await this.auditoriaService.registrar({
        trabajadorId: userId,
        accion: 'QUITAR_PREMIO',
        modulo: 'BENEFICIOS',
        descripcion: `Quito del catálogo de premios el producto "${producto.nombre}"`,
        datosNuevos: { producto_id: id },
      });
    }
  }


    async getResumenPuntos(pacienteId: number, limiteMovimientos = 20): Promise<ResumenPuntos> {
    const hoy = this.fechaStr(new Date());

    const [pb, lotesVigentes, movimientos] = await Promise.all([
      this.pbRepo.findOne({ where: { paciente_id: pacienteId } }),
      this.movRepo.find({
        where: {
          paciente_id: pacienteId,
          tipo: 'ACUMULACION',
          saldo_restante: MoreThan(0),
          fecha_vencimiento: MoreThanOrEqual(hoy),
        },
        order: { fecha_vencimiento: 'ASC', id: 'ASC' },
      }),
      this.movRepo.find({
        where: { paciente_id: pacienteId },
        order: { id: 'DESC' },
        take: limiteMovimientos,
      }),
    ]);

    const [proximo] = lotesVigentes;

    return {
      saldo: lotesVigentes.reduce((sum, lote) => sum + Number(lote.saldo_restante), 0),
      historico: Number(pb?.puntos_historicos ?? 0),
      fraccion: Number(pb?.fraccion_acumulada ?? 0),
      proximoVencimiento: proximo
        ? { puntos: Number(proximo.saldo_restante), fecha: String(proximo.fecha_vencimiento) }
        : null,
      movimientos,
    };
   } 
}
