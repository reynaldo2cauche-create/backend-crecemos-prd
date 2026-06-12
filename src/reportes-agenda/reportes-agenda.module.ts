import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitasModule } from '../citas/citas.module';
import { MailModule } from '../mail/mail.module';
import { ResponsablePaciente } from '../pacientes/entities/responsable-paciente.entity';
import { ReportesAgendaService } from './reportes-agenda.service';
import { ReportesAgendaController } from './reportes-agenda.controller';

@Module({
  imports: [CitasModule, MailModule, TypeOrmModule.forFeature([ResponsablePaciente])],
  controllers: [ReportesAgendaController],
  providers: [ReportesAgendaService],
})
export class ReportesAgendaModule {}
