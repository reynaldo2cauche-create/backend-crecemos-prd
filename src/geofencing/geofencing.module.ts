import { Module } from '@nestjs/common';
import { GeofencingService } from './geofencing.service';
import { GeofencingGuard } from './geofencing.guard';
import { GeofencingController } from './geofencing.controller';

@Module({
  controllers: [GeofencingController],
  providers: [GeofencingService, GeofencingGuard],
  exports: [GeofencingService, GeofencingGuard],
})
export class GeofencingModule {}
