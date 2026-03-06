import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndicacionTerapeutica } from './entities/indicacion-terapeutica.entity';
import { IndicacionCita } from './entities/indicacion-cita.entity';
import { IndicacionReferencia } from './entities/indicacion-referencia.entity';
import { IndicacionRecomendaciones } from './entities/indicacion-recomendaciones.entity';
import { IndicacionMateriales } from './entities/indicacion-materiales.entity';
import { CreateIndicacionTerapeuticaDto } from './dto/create-indicacion-terapeutica.dto';

@Injectable()
export class IndicacionTerapeuticaService {
  constructor(
    @InjectRepository(IndicacionTerapeutica)
    private readonly indicacionRepo: Repository<IndicacionTerapeutica>,
    @InjectRepository(IndicacionCita)
    private readonly citaRepo: Repository<IndicacionCita>,
    @InjectRepository(IndicacionReferencia)
    private readonly referenciaRepo: Repository<IndicacionReferencia>,
    @InjectRepository(IndicacionRecomendaciones)
    private readonly recomendacionesRepo: Repository<IndicacionRecomendaciones>,
    @InjectRepository(IndicacionMateriales)
    private readonly materialesRepo: Repository<IndicacionMateriales>,
  ) {}

  async create(dto: CreateIndicacionTerapeuticaDto): Promise<IndicacionTerapeutica> {
    const now = new Date();
    const hora = now.toTimeString().split(' ')[0];

    const indicacion = this.indicacionRepo.create({
      fecha: dto.fecha,
      hora,
      pacienteId: dto.pacienteId,
      trabajadorId: dto.trabajadorId,
      especialidadId: dto.especialidadId,
      servicioId: dto.servicioId,
    });

    const savedIndicacion = await this.indicacionRepo.save(indicacion);

    if (dto.citas && dto.citas.length > 0) {
      const citas = dto.citas.map(citaDto =>
        this.citaRepo.create({ ...citaDto, indicacionId: savedIndicacion.id }),
      );
      await this.citaRepo.save(citas);
    }

    if (dto.referencias) {
      const r = dto.referencias;
      await this.referenciaRepo.save(
        this.referenciaRepo.create({
          indicacionId: savedIndicacion.id,
          // Internas
          refInterTerapiaLenguaje:     r.refInterTerapiaLenguaje     ?? false,
          refInterTerapiaOcupacional:  r.refInterTerapiaOcupacional  ?? false,
          refInterPsicologia:          r.refInterPsicologia          ?? false,
          refInterPsicoterapiaInd:     r.refInterPsicoterapiaInd     ?? false,
          refInterTerapiaParejaFam:    r.refInterTerapiaParejaFam    ?? false,
          refInterTerapiaFisica:       r.refInterTerapiaFisica       ?? false,
          refInterTerapiaRespiratoria: r.refInterTerapiaRespiratoria ?? false,
          // Externas
          refExterNeuropediatra:        r.refExterNeuropediatra        ?? false,
          refExterNeuropsicologia:      r.refExterNeuropsicologia      ?? false,
          refExterPsiquiatria:          r.refExterPsiquiatria          ?? false,
          refExterNeurologia:           r.refExterNeurologia           ?? false,
          refExterGastroenterologo:     r.refExterGastroenterologo     ?? false,
          refExterNutricion:            r.refExterNutricion            ?? false,
          refExterOtorrinolaringologia: r.refExterOtorrinolaringologia ?? false,
          refExterGeriatria:            r.refExterGeriatria            ?? false,
          refExterOtros:                r.refExterOtros                ?? null,
        }),
      );
    }

    if (dto.recomendaciones) {
      const rec = dto.recomendaciones;
      await this.recomendacionesRepo.save(
        this.recomendacionesRepo.create({
          indicacionId: savedIndicacion.id,
          // Preimpresas (default true)
          asistirPuntualmente:  rec.asistirPuntualmente  ?? true,
          evitarFaltarSinAviso: rec.evitarFaltarSinAviso ?? true,
          practicarEnCasa:      rec.practicarEnCasa      ?? true,
          // Terapia de Lenguaje Infantil
          dedicar1520MinDiarios:     rec.dedicar1520MinDiarios     ?? false,
          evitarCorregirBruscamente: rec.evitarCorregirBruscamente ?? false,
          crearAmbienteRico:         rec.crearAmbienteRico         ?? false,
          informarCambios:           rec.informarCambios           ?? false,
          evitarPantallasExcesivas:  rec.evitarPantallasExcesivas  ?? false,
          // Terapia Ocupacional
          dedicar1520MinActividades:    rec.dedicar1520MinActividades    ?? false,
          establecerRutinaEstructurada: rec.establecerRutinaEstructurada ?? false,
          favorecerAutonomia:           rec.favorecerAutonomia           ?? false,
          realizarActividadesMotricidad:rec.realizarActividadesMotricidad?? false,
          // Terapia de Lenguaje Adultos
          evitarCorregirseConFrustracion: rec.evitarCorregirseConFrustracion ?? false,
          evitarDistraccionesPractica:    rec.evitarDistraccionesPractica    ?? false,
          notificarCambiosSalud:          rec.notificarCambiosSalud          ?? false,
          realizarEjerciciosEnsenados:    rec.realizarEjerciciosEnsenados    ?? false,
          involucrarFamiliarCuidador:     rec.involucrarFamiliarCuidador     ?? false,
          // Terapia Deglutoria Adultos
          mantenerSentado90Grados:     rec.mantenerSentado90Grados     ?? false,
          evitarComerAcostado:         rec.evitarComerAcostado         ?? false,
          ofrecerPorcionesPequenas:    rec.ofrecerPorcionesPequenas    ?? false,
          verificarTragoCompleto:      rec.verificarTragoCompleto      ?? false,
          permitirTiempoEntreBocados:  rec.permitirTiempoEntreBocados  ?? false,
          evitarHablarConAlimento:     rec.evitarHablarConAlimento     ?? false,
          evitarApresurarAlimentacion: rec.evitarApresurarAlimentacion ?? false,
          dietaTipoPure:               rec.dietaTipoPure               ?? false,
          usarEspesanteLiquidos:       rec.usarEspesanteLiquidos       ?? false,
          // Psicología Infantil
          fomentarAmbienteConfianza:           rec.fomentarAmbienteConfianza           ?? false,
          evitarEtiquetasNegativas:            rec.evitarEtiquetasNegativas            ?? false,
          tenerPacienciaExpectativasRealistas: rec.tenerPacienciaExpectativasRealistas ?? false,
          // Psicología Adolescentes
          evitarConfrontacionesInmediatas: rec.evitarConfrontacionesInmediatas ?? false,
          respetarEspacioTerapeutico:      rec.respetarEspacioTerapeutico      ?? false,
          cumplirTareasFamilia:            rec.cumplirTareasFamilia            ?? false,
          // Terapia de Pareja y Familiar
          ambosAsistirSesiones:         rec.ambosAsistirSesiones         ?? false,
          evitarDiscutirTemasSensibles: rec.evitarDiscutirTemasSensibles ?? false,
          actitudAperturaRespeto:       rec.actitudAperturaRespeto       ?? false,
          comprometerSeBuscarCulpables: rec.comprometerSeBuscarCulpables ?? false,
          noDecisionesImpulsivas:       rec.noDecisionesImpulsivas       ?? false,
          // Psicoterapia
          serHonestoTerapeuta:            rec.serHonestoTerapeuta            ?? false,
          evitarJuzgarse:                 rec.evitarJuzgarse                 ?? false,
          registrarPensamientosEmociones: rec.registrarPensamientosEmociones ?? false,
          informarEventosImportantes:     rec.informarEventosImportantes     ?? false,
          otros: rec.otros ?? null,
        }),
      );
    }

    if (dto.materiales) {
      const m = dto.materiales;
      await this.materialesRepo.save(
        this.materialesRepo.create({
          indicacionId: savedIndicacion.id,
          hojasBond:                     m.hojasBond                     ?? false,
          plumones:                      m.plumones                      ?? false,
          lapizBorrador:                 m.lapizBorrador                 ?? false,
          cartulinaDuplex:               m.cartulinaDuplex               ?? false,
          siliconaLiquida:               m.siliconaLiquida               ?? false,
          limpiatipo:                    m.limpiatipo                    ?? false,
          velcro:                        m.velcro                        ?? false,
          cartulinaColores:              m.cartulinaColores              ?? false,
          cuaderno:                      m.cuaderno                      ?? false,
          folder:                        m.folder                        ?? false,
          fotos:                         m.fotos                         ?? false,
          guantesBajalenguaHisoposCrema: m.guantesBajalenguaHisoposCrema ?? false,
          cintaEmbalaje:                 m.cintaEmbalaje                 ?? false,
          botellaAgua:                   m.botellaAgua                   ?? false,
          plumonIndeleble:               m.plumonIndeleble               ?? false,
          munecos:                       m.munecos                       ?? false,
          otros:                         m.otros                         ?? null,
        }),
      );
    }

    return this.findOne(savedIndicacion.id);
  }

  async findByPaciente(pacienteId: number): Promise<IndicacionTerapeutica[]> {
    return this.indicacionRepo.find({
      where: { pacienteId, activo: true },
      relations: [
        'paciente', 'trabajador', 'especialidad', 'servicio', 'servicio.area', 'servicio.especialidad',
        'citas', 'citas.tipo', 'citas.modalidad', 'citas.frecuencia',
        'referencias', 'recomendaciones', 'materiales',
      ],
      order: { fecha: 'DESC', hora: 'DESC' },
    });
  }

  async findOne(id: number): Promise<IndicacionTerapeutica> {
    const indicacion = await this.indicacionRepo.findOne({
      where: { id, activo: true },
      relations: [
        'paciente', 'trabajador', 'especialidad', 'servicio', 'servicio.area', 'servicio.especialidad',
        'citas', 'citas.tipo', 'citas.modalidad', 'citas.frecuencia',
        'referencias', 'recomendaciones', 'materiales',
      ],
    });

    if (!indicacion) {
      throw new NotFoundException(`Indicación terapéutica con ID ${id} no encontrada`);
    }

    return indicacion;
  }

  async delete(id: number): Promise<void> {
    const indicacion = await this.findOne(id);
    indicacion.activo = false;
    await this.indicacionRepo.save(indicacion);
  }
}