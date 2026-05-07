import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacienteService } from './paciente.service';
import { Paciente } from './paciente.entity';

@Injectable()
export class PacientesInactivosScheduler implements OnModuleInit {
  private readonly logger = new Logger(PacientesInactivosScheduler.name);
  private ultimaEjecucion: Date | null = null;

  constructor(
    private readonly pacienteService: PacienteService,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
  ) {}

  /**
   * Se ejecuta automáticamente cuando el módulo inicia.
   * 1) Migra/procesa data histórica inmediatamente.
   * 2) Programa verificación diaria a las 3 AM.
   */
  async onModuleInit() {
    this.logger.log('🚀 Módulo iniciado — ejecutando migración de data histórica...');

    await this.ejecutarActualizacionAutomatica();

    this.logger.log('✅ Migración inicial completada.');
    this.logger.log('⏱️  Iniciando scheduler: verificación diaria a las 3 AM');

    // Verificar cada hora si toca ejecutar
    setInterval(() => this.verificarSiTocaEjecutar(), 60 * 60 * 1000);
  }

  /**
   * Verifica si es las 3 AM y si aún no se ejecutó hoy.
   * Evita ejecuciones duplicadas dentro de la misma hora.
   */
  private async verificarSiTocaEjecutar() {
    const ahora = new Date();

    // Solo ejecutar a las 3 AM
    if (ahora.getHours() !== 3) return;

    // Evitar doble ejecución si ya corrió hoy
    if (this.ultimaEjecucion) {
      const mismodia =
        this.ultimaEjecucion.getFullYear() === ahora.getFullYear() &&
        this.ultimaEjecucion.getMonth() === ahora.getMonth() &&
        this.ultimaEjecucion.getDate() === ahora.getDate();

      if (mismodia) return;
    }

    this.logger.log('🕒 Son las 3 AM — ejecutando verificación diaria...');
    await this.ejecutarActualizacionAutomatica();
  }

  /**
   * Lógica principal: actualiza estado global de pacientes Y estado por servicio.
   * También puede ser invocado manualmente desde el controller.
   */
  async ejecutarActualizacionAutomatica() {
    this.logger.log('⚙️  Iniciando actualización de servicios inactivos por paciente...');

    try {
      const resultado = await this.pacienteService.actualizarServiciosInactivos();

      this.ultimaEjecucion = new Date();

      this.logger.log(`✅ Completado. Servicios inactivados: ${resultado.actualizados}`);
      if (resultado.actualizados > 0) {
        resultado.detalles.forEach(d =>
          this.logger.log(`   - PS ${d.pacienteServicioId}: ${d.paciente} · ${d.servicio} (última cita: ${d.ultimaCita})`)
        );
      }

      return resultado;
    } catch (error) {
      this.logger.error(`❌ Error en actualización: ${error.message}`, error.stack);
      throw error;
    }
  }
}