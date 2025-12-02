export class RegistrarAuditoriaDto {
  trabajadorId: number;
  trabajadorNombre: string;
  trabajadorUsername: string;
  trabajadorRol?: string;
  accion: string;
  modulo: string;
  entidadTipo?: string;
  entidadId?: number;
  entidadNombre?: string;
  descripcion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  ipAddress?: string;
  userAgent?: string;
  metodoHttp?: string;
  endpoint?: string;
  codigoRespuesta?: number;
}
