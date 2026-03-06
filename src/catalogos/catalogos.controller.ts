import { Controller, Get, Param } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';

@Controller('backend_api/catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('tipo-documento')
  getTipoDocumento() {
    return this.catalogosService.getTipoDocumento();
  }

  @Get('sexo')
  getSexo() {
    return this.catalogosService.getSexo();
  }

  @Get('provincias')
  getProvincias() {
    return this.catalogosService.getProvincias();
  }

  @Get('distrito')
  getDistrito() {
    return this.catalogosService.getDistrito();
  }

  @Get('distritos/provincia/:provinciaId')
  getDistritosByProvincia(@Param('provinciaId') provinciaId: string) {
    return this.catalogosService.getDistritosByProvincia(+provinciaId);
  }

  @Get('relacion-responsable')
  getRelacionResponsable() {
    return this.catalogosService.getRelacionResponsable();
  }

  @Get('area-servicio')
  getAreaServicio() {
    return this.catalogosService.getAreaServicio();
  }

  @Get('servicios')
  getServicios() {
    return this.catalogosService.getServicios();
  }

  @Get('grado-escolar')
  getGradoEscolar() {
    return this.catalogosService.getGradoEscolar();
  }

  @Get('atenciones')
  getAtenciones() {
    return this.catalogosService.getAtenciones();
  }

  @Get('relacion-padres')
  getRelacionPadres() {
    return this.catalogosService.getRelacionPadres();
  }

  @Get('antecedentes-familiares')
  getAntecedentesFamiliares() {
    return this.catalogosService.getAntecedentesFamiliares();
  }

  @Get('ocupaciones')
  getOcupaciones() {
    return this.catalogosService.getOcupaciones();
  }

  @Get('estado-civil')
  getEstadoCivil() {
    return this.catalogosService.getEstadoCivil();
  }

  @Get('parentesco')
  getParentesco() {
    return this.catalogosService.getParentesco();
  }

  @Get('nivel-educacion')
  getNivelEducacion() {
    return this.catalogosService.getNivelEducacion();
  }

  @Get('paquetes')
  getPaquetes() {
    return this.catalogosService.getPaquetes();
  }

  @Get('modalidades')
  getModalidades() {
    return this.catalogosService.getModalidades();
  }

  @Get('frecuencias')
  getFrecuencias() {
    return this.catalogosService.getFrecuencias();
  }
}
