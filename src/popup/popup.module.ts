import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PopupConfiguracion } from './popup-configuracion.entity';
import { PopupService } from './popup.service';
import { PopupController } from './popup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PopupConfiguracion])],
  providers: [PopupService],
  controllers: [PopupController],
  exports: [PopupService],
})
export class PopupModule {}
