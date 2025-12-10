import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PopupProgramado } from './popup-programado.entity';
import { PopupService } from './popup.service';
import { PopupController } from './popup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PopupProgramado])],
  providers: [PopupService],
  controllers: [PopupController],
  exports: [PopupService],
})
export class PopupModule {}
