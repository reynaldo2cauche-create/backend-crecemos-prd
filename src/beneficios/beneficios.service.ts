import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beneficio } from './beneficios.entity';

@Injectable()
export class BeneficiosService {
  constructor(
    @InjectRepository(Beneficio)
    private readonly beneficioRepository: Repository<Beneficio>,
  ) {}

  /**
   * Obtiene todos los beneficios activos y vigentes
   */
  async findAll() {
    const beneficios = await this.beneficioRepository.find({
      where: { 
        activo: true 
      },
      order: {
        categoria: 'ASC',
        nombre: 'ASC'
      }
    });

    // Filtrar beneficios vigentes (fecha_vigencia >= hoy)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const beneficiosVigentes = beneficios.filter(beneficio => {
      const fechaVigencia = new Date(beneficio.fecha_vigencia);
      fechaVigencia.setHours(0, 0, 0, 0);
      return fechaVigencia >= hoy;
    });

    return beneficiosVigentes;
  }
}