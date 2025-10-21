export class PostulacionResponseDto {
  id_postulacion: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  distrito: string;
  cv_url: string;
  cargo_postulado: string;
  estado: string;
  fecha_postulacion: Date;
  comentarios: ComentarioResponseDto[];
}

export class ComentarioResponseDto {
  id_comentario: number;
  id_postulacion: number;
  id_trabajador: number;
  comentario: string;
  fecha_comentario: Date;
}