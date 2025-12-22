import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDocumento } from './tipo-documento.entity';
import { Sexo } from './sexo.entity';
import { Distrito } from './distrito.entity';
import { RelacionResponsable } from './relacion-responsable.entity';
import { AreaServicio } from './area-servicio.entity';
import { Servicios } from './servicios.entity';
import { GradoEscolar } from './grado-escolar.entity';
import { Atenciones } from './atenciones.entity';
import { RelacionPadres } from './relacion-padres.entity';
import { AntecedentesFamiliares } from './antecedentes-familiares.entity';
import { Ocupaciones } from './ocupaciones.entity';


@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(TipoDocumento)
    private tipoDocumentoRepository: Repository<TipoDocumento>,
    @InjectRepository(Sexo)
    private sexoRepository: Repository<Sexo>,
    @InjectRepository(Distrito)
    private distritoRepository: Repository<Distrito>,
    @InjectRepository(RelacionResponsable)
    private relacionResponsableRepository: Repository<RelacionResponsable>,
    @InjectRepository(AreaServicio)
    private areaServicioRepository: Repository<AreaServicio>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    @InjectRepository(GradoEscolar)
    private gradoEscolarRepository: Repository<GradoEscolar>,
    @InjectRepository(Atenciones)
    private atencionesRepository: Repository<Atenciones>,
    @InjectRepository(RelacionPadres)
    private relacionPadresRepository: Repository<RelacionPadres>,
    @InjectRepository(AntecedentesFamiliares)
    private antecedentesFamiliaresRepository: Repository<AntecedentesFamiliares>,
    @InjectRepository(Ocupaciones)
    private ocupacionesRepository: Repository<Ocupaciones>,
  ) {}

  getTipoDocumento() {
    return this.tipoDocumentoRepository.find({ where: { activo: true } });
  }

  getSexo() {
    return this.sexoRepository.find({ where: { activo: true } });
  }

  getDistrito() {
    return this.distritoRepository.find({ where: { activo: true } });
  }

  getRelacionResponsable() {
    return this.relacionResponsableRepository.find({ where: { activo: true } });
  }

  getAreaServicio() {
    return this.areaServicioRepository.find({ where: { activo: true } });
  }

  getServicios() {
    return this.serviciosRepository.find({ where: { activo: true }, relations: ['area'] });
  }

  getGradoEscolar() {
    return this.gradoEscolarRepository.find({ 
      where: { activo: true },
      order: { orden: 'ASC' }
    });
  }

  getAtenciones() {
    return this.atencionesRepository.find({ 
      where: { activo: true },
      order: { nombre: 'ASC' }
    });
  }

  getRelacionPadres() {
    return this.relacionPadresRepository.find({ 
      where: { activo: true },
      order: { nombre: 'ASC' }
    });
  }

  getAntecedentesFamiliares() {
    return this.antecedentesFamiliaresRepository.find({ 
      where: { activo: true },
      order: { nombre: 'ASC' }
    });
  }

  getOcupaciones() {
    return this.ocupacionesRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' }
    });
  }
}