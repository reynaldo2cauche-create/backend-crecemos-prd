import { IsNotEmpty, IsInt, IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIndicacionCitaDto {
  @IsInt()
  tipoId: number;

  @IsInt()
  modalidadId: number;

  @IsInt()
  frecuenciaId: number;

  @IsOptional()
  @IsInt()
  cantidadCitas?: number;

  @IsOptional()
  @IsBoolean()
  informeFisico?: boolean;

  @IsOptional()
  @IsBoolean()
  informeVerbal?: boolean;
}

export class CreateIndicacionReferenciaDto {
  @IsOptional()
  @IsBoolean()
  refInterTerapiaLenguaje?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterTerapiaOcupacional?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterPsicologia?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterPsicoterapiaInd?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterTerapiaParejaFam?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterTerapiaFisica?: boolean;

  @IsOptional()
  @IsBoolean()
  refInterTerapiaRespiratoria?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterNeuropediatra?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterNeuropsicologia?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterPsiquiatria?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterNeurologia?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterGastroenterologo?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterNutricion?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterOtorrinolaringologia?: boolean;

  @IsOptional()
  @IsBoolean()
  refExterGeriatria?: boolean;

  @IsOptional()
  @IsString()
  refExterOtros?: string;
}

export class CreateIndicacionRecomendacionesDto {
  @IsOptional()
  @IsBoolean()
  asistirPuntualmente?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarFaltarSinAviso?: boolean;

  @IsOptional()
  @IsBoolean()
  practicarEnCasa?: boolean;

  @IsOptional()
  @IsBoolean()
  dedicar1520MinDiarios?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarCorregirBruscamente?: boolean;

  @IsOptional()
  @IsBoolean()
  crearAmbienteRico?: boolean;

  @IsOptional()
  @IsBoolean()
  informarCambios?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarPantallasExcesivas?: boolean;

  @IsOptional()
  @IsBoolean()
  dedicar1520MinActividades?: boolean;

  @IsOptional()
  @IsBoolean()
  establecerRutinaEstructurada?: boolean;

  @IsOptional()
  @IsBoolean()
  favorecerAutonomia?: boolean;

  @IsOptional()
  @IsBoolean()
  realizarActividadesMotricidad?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarCorregirseConFrustracion?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarDistraccionesPractica?: boolean;

  @IsOptional()
  @IsBoolean()
  notificarCambiosSalud?: boolean;

  @IsOptional()
  @IsBoolean()
  realizarEjerciciosEnsenados?: boolean;

  @IsOptional()
  @IsBoolean()
  involucrarFamiliarCuidador?: boolean;

  @IsOptional()
  @IsBoolean()
  mantenerSentado90Grados?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarComerAcostado?: boolean;

  @IsOptional()
  @IsBoolean()
  ofrecerPorcionesPequenas?: boolean;

  @IsOptional()
  @IsBoolean()
  verificarTragoCompleto?: boolean;

  @IsOptional()
  @IsBoolean()
  permitirTiempoEntreBocados?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarHablarConAlimento?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarApresurarAlimentacion?: boolean;

  @IsOptional()
  @IsBoolean()
  dietaTipoPure?: boolean;

  @IsOptional()
  @IsBoolean()
  usarEspesanteLiquidos?: boolean;

  @IsOptional()
  @IsBoolean()
  fomentarAmbienteConfianza?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarEtiquetasNegativas?: boolean;

  @IsOptional()
  @IsBoolean()
  tenerPacienciaExpectativasRealistas?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarConfrontacionesInmediatas?: boolean;

  @IsOptional()
  @IsBoolean()
  respetarEspacioTerapeutico?: boolean;

  @IsOptional()
  @IsBoolean()
  cumplirTareasFamilia?: boolean;

  @IsOptional()
  @IsBoolean()
  ambosAsistirSesiones?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarDiscutirTemasSensibles?: boolean;

  @IsOptional()
  @IsBoolean()
  actitudAperturaRespeto?: boolean;

  @IsOptional()
  @IsBoolean()
  comprometerSeBuscarCulpables?: boolean;

  @IsOptional()
  @IsBoolean()
  noDecisionesImpulsivas?: boolean;

  @IsOptional()
  @IsBoolean()
  serHonestoTerapeuta?: boolean;

  @IsOptional()
  @IsBoolean()
  evitarJuzgarse?: boolean;

  @IsOptional()
  @IsBoolean()
  registrarPensamientosEmociones?: boolean;

  @IsOptional()
  @IsBoolean()
  informarEventosImportantes?: boolean;

  @IsOptional()
  @IsString()
  otros?: string;
}

export class CreateIndicacionMaterialesDto {
  @IsOptional()
  @IsBoolean()
  hojasBond?: boolean;

  @IsOptional()
  @IsBoolean()
  plumones?: boolean;

  @IsOptional()
  @IsBoolean()
  lapizBorrador?: boolean;

  @IsOptional()
  @IsBoolean()
  cartulinaDuplex?: boolean;

  @IsOptional()
  @IsBoolean()
  siliconaLiquida?: boolean;

  @IsOptional()
  @IsBoolean()
  limpiatipo?: boolean;

  @IsOptional()
  @IsBoolean()
  velcro?: boolean;

  @IsOptional()
  @IsBoolean()
  cartulinaColores?: boolean;

  @IsOptional()
  @IsBoolean()
  cuaderno?: boolean;

  @IsOptional()
  @IsBoolean()
  folder?: boolean;

  @IsOptional()
  @IsBoolean()
  fotos?: boolean;

  @IsOptional()
  @IsBoolean()
  guantesBajalenguaHisoposCrema?: boolean;

  // ── Materiales granulares de Terapia de Lenguaje ──
  @IsOptional()
  @IsBoolean()
  guantes?: boolean;

  @IsOptional()
  @IsBoolean()
  bajalengua?: boolean;

  @IsOptional()
  @IsBoolean()
  hisoposPequenos?: boolean;

  @IsOptional()
  @IsBoolean()
  hisoposLargos?: boolean;

  @IsOptional()
  @IsBoolean()
  plumonesGruesos?: boolean;

  @IsOptional()
  @IsBoolean()
  cuadernoCuadriculado?: boolean;

  @IsOptional()
  @IsBoolean()
  cuadernoDecroly?: boolean;

  @IsOptional()
  @IsBoolean()
  cintaEmbalaje?: boolean;

  @IsOptional()
  @IsBoolean()
  botellaAgua?: boolean;

  @IsOptional()
  @IsBoolean()
  plumonIndeleble?: boolean;

    @IsOptional()
  @IsBoolean()
  munecos?: boolean;

  @IsOptional()
  @IsString()
  otros?: string;
}

export class CreateIndicacionTerapeuticaDto {
  @IsNotEmpty()
  @IsString()
  fecha: string; // La fecha es enviada desde el frontend (fecha de indicación)

  // hora se genera automáticamente en el backend

  @IsNotEmpty()
  @IsInt()
  pacienteId: number;

  @IsNotEmpty()
  @IsInt()
  trabajadorId: number;

  @IsNotEmpty()
  @IsInt()
  especialidadId: number;

  @IsNotEmpty()
  @IsInt()
  servicioId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIndicacionCitaDto)
  citas?: CreateIndicacionCitaDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateIndicacionReferenciaDto)
  referencias?: CreateIndicacionReferenciaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateIndicacionRecomendacionesDto)
  recomendaciones?: CreateIndicacionRecomendacionesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateIndicacionMaterialesDto)
  materiales?: CreateIndicacionMaterialesDto;
}
