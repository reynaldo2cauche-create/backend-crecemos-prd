import { Module } from '@nestjs/common';
import { GeofencingService } from './geofencing.service';
import { GeofencingGuard } from './geofencing.guard';

@Module({
  providers: [GeofencingService, GeofencingGuard],
  exports: [GeofencingService, GeofencingGuard],
})
export class GeofencingModule {}
