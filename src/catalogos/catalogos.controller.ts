import { Controller, Get } from '@nestjs/common';
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

  @Get('distrito')
  getDistrito() {
    return this.catalogosService.getDistrito();
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
}