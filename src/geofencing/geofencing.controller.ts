import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeofencingService } from './geofencing.service';

/**
 * Config del geofencing para que el frontend (aviso de perímetro) lea el MISMO
 * centro/radio que usa el backend para enforcar. Única fuente de verdad: el backend.
 */
@Controller('backend_api/geofencing')
@UseGuards(JwtAuthGuard)
export class GeofencingController {
  constructor(private readonly geofencingService: GeofencingService) {}

  @Get('config')
  getConfig() {
    const centro = this.geofencingService.obtenerCoordenadasCentro();
    return {
      lat: centro.lat,
      lng: centro.lng,
      radio: this.geofencingService.obtenerRadioPermitido(),
    };
  }
}
