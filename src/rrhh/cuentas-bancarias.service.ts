import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { CrearCuentaBancariaDto } from './dto/crear-cuenta-bancaria.dto';
import { ActualizarCuentaBancariaDto } from './dto/actualizar-cuenta-bancaria.dto';

@Injectable()
export class CuentasBancariasService {
  constructor(
    @InjectRepository(CuentaBancaria)
    private cuentasRepository: Repository<CuentaBancaria>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
  ) {}

  /**
   * Obtener todas las cuentas bancarias de un trabajador
   */
  async obtenerCuentasPorTrabajador(trabajadorId: number): Promise<CuentaBancaria[]> {
    return await this.cuentasRepository.find({
      where: { trabajador: { id: trabajadorId } },
      order: { es_principal: 'DESC', created_at: 'ASC' },
    });
  }

  /**
   * Crear una nueva cuenta bancaria
   */
  async crearCuenta(dto: CrearCuentaBancariaDto): Promise<CuentaBancaria> {
    const trabajador = await this.trabajadorRepository.findOne({
      where: { id: dto.trabajadorId },
    });

    if (!trabajador) {
      throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);
    }

    // Si se marca como principal, desmarcar las demás cuentas del trabajador
    if (dto.es_principal) {
      await this.cuentasRepository.update(
        { trabajador: { id: dto.trabajadorId } },
        { es_principal: false },
      );
    }

    const cuenta = this.cuentasRepository.create({
      trabajador,
      banco: dto.banco,
      numero_cuenta: dto.numero_cuenta,
      cci: dto.cci,
      es_principal: dto.es_principal || false,
    });

    return await this.cuentasRepository.save(cuenta);
  }

  /**
   * Actualizar una cuenta bancaria
   */
  async actualizarCuenta(id: number, dto: ActualizarCuentaBancariaDto): Promise<CuentaBancaria> {
    const cuenta = await this.cuentasRepository.findOne({
      where: { id },
      relations: ['trabajador'],
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    }

    // Si se marca como principal, desmarcar las demás cuentas del trabajador
    if (dto.es_principal) {
      await this.cuentasRepository.update(
        {
          trabajador: { id: cuenta.trabajador.id },
          id: { $ne: id } as any,
        },
        { es_principal: false },
      );
    }

    Object.assign(cuenta, dto);
    return await this.cuentasRepository.save(cuenta);
  }

  /**
   * Eliminar una cuenta bancaria
   */
  async eliminarCuenta(id: number): Promise<void> {
    const cuenta = await this.cuentasRepository.findOne({
      where: { id },
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    }

    await this.cuentasRepository.remove(cuenta);
  }

  /**
   * Obtener una cuenta bancaria por ID
   */
  async obtenerCuentaPorId(id: number): Promise<CuentaBancaria> {
    const cuenta = await this.cuentasRepository.findOne({
      where: { id },
      relations: ['trabajador'],
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    }

    return cuenta;
  }

  /**
   * Marcar una cuenta como principal
   */
  async marcarComoPrincipal(id: number): Promise<CuentaBancaria> {
    const cuenta = await this.cuentasRepository.findOne({
      where: { id },
      relations: ['trabajador'],
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    }

    // Desmarcar todas las cuentas del trabajador
    await this.cuentasRepository.update(
      { trabajador: { id: cuenta.trabajador.id } },
      { es_principal: false },
    );

    // Marcar esta cuenta como principal
    cuenta.es_principal = true;
    return await this.cuentasRepository.save(cuenta);
  }
}
