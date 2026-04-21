import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GruposPreguntas } from './grupos-preguntas.entity';
import { ResultadosTest } from './resultados-test.entity';
import { DatosEstudiante } from './datos-estudiante.entity';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(GruposPreguntas)
    private gruposPreguntasRepo: Repository<GruposPreguntas>,
    @InjectRepository(ResultadosTest)
    private resultadosTestRepo: Repository<ResultadosTest>,
    private dataSource: DataSource,
  ) {}

  async getEstructuraTest(tipo_test_id: number) {
    const tipoTest = await this.dataSource.getRepository('tipos_test').findOne({
      where: { id: tipo_test_id },
      select: ['id', 'nombre','descripcion', 'grados', 'nivel', 'duracion', 'finalidad', 'objetivo', 'aplicacion', 'titulo_test_detallado']
    });

    const grupos = await this.gruposPreguntasRepo.find({
      where: { tipo_test: { id: tipo_test_id } },
      order: { orden: 'ASC' },
      relations: [
        'preguntas_grupo',
        'preguntas_grupo.pregunta',
        'preguntas_grupo.pregunta.opciones'
      ]
    });
    
    // Ordenar manualmente las preguntas_grupo por 'orden'
    for (const grupo of grupos) {
      if (grupo.preguntas_grupo) {
        grupo.preguntas_grupo.sort((a, b) => a.orden - b.orden);
      }
    }
    
    return {
      tipoTest,
      grupos
    };
  }

  async guardarResultadoTest(data: { resultados: Partial<ResultadosTest>[], estudiante: Partial<DatosEstudiante> }) {
    const estudianteRepo = this.dataSource.getRepository(DatosEstudiante);
    // Crear y guardar el estudiante
    const estudiante = await estudianteRepo.save(estudianteRepo.create(data.estudiante));
  
    // Guardar todos los resultados asociados al estudiante
    const resultados = data.resultados.map(res =>
      this.resultadosTestRepo.create({
        ...res,
        estudiante: estudiante,
      })
    );
    const resultadosGuardados = await this.resultadosTestRepo.save(resultados);
  
    // Calcular el puntaje total
    const puntajeTotal = resultadosGuardados.reduce((sum, res) => sum + (res.puntaje || 0), 0);
  
    // Devolver los resultados guardados junto con el puntaje total
    return {
      resultados: resultadosGuardados,
      puntaje_total: puntajeTotal
    };
  }

  async getTablaAlumnosEvaluados(
    tipo_test_id: number,
    fechaInicio?: string,
    fechaFin?: string,
    estudianteId?: number,
    gradoId?: number,
    seccionId?: number,
    colegioId?: number
  ) {
    console.log('Parámetros recibidos:', {
      tipo_test_id,
      fechaInicio,
      fechaFin,
      estudianteId,
      gradoId,
      seccionId,
      colegioId
    });

    // Consulta de verificación
    const verificacion = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM crecemos_website.datos_estudiantes de
      INNER JOIN crecemos_website.resultados_test rt ON de.id = rt.estudiante_id
      WHERE de.grado_id = ? AND rt.tipo_test_id = ?
    `, [gradoId, tipo_test_id]);
    
    console.log('Verificación de datos:', verificacion);

    const grupos = await this.dataSource.query(
      'SELECT nombre FROM grupos_preguntas WHERE tipo_test_id = ?',
      [tipo_test_id]
    );
  
    const areaColumns = grupos
      .map((g: any) => `
        CASE
          WHEN
            SUM(CASE WHEN rpa.area_nombre = '${g.nombre.replace(/'/g, "\\'")}' THEN rpa.puntaje_area ELSE 0 END) =
            (SELECT SUM(max_puntaje) FROM (
                SELECT MAX(op.puntaje) as max_puntaje
                FROM crecemos_website.preguntas_grupo pg2
                INNER JOIN crecemos_website.grupos_preguntas gp2 ON pg2.grupo_id = gp2.id
                INNER JOIN crecemos_website.preguntas p2 ON pg2.pregunta_id = p2.id
                INNER JOIN crecemos_website.opciones_pregunta op ON op.pregunta_id = p2.id
                WHERE gp2.nombre = '${g.nombre.replace(/'/g, "\\'")}' AND gp2.tipo_test_id = ${tipo_test_id}
                GROUP BY p2.id
            ) as sub)
          THEN '✔'
          ELSE 'X'
        END AS \`${g.nombre.replace(/`/g, '')}\`
      `)
      .join(',\n  ');

    let resultadoCase = '';

    if (tipo_test_id == 1) {
      resultadoCase = `
          CASE
          WHEN rt.puntaje_total BETWEEN 0 AND 3 THEN '#FF0000'
          WHEN rt.puntaje_total BETWEEN 4 AND 6 THEN '#FFFF00'
          WHEN rt.puntaje_total BETWEEN 7 AND 10 THEN '#00FF00'
          ELSE '#FF0000'
          END AS RESULTADO
      `;
    } else if (tipo_test_id == 2) {
      resultadoCase = `
          CASE
          WHEN rt.puntaje_total BETWEEN 0 AND 3 THEN '#FF0000'
          WHEN rt.puntaje_total BETWEEN 4 AND 6 THEN '#FFFF00'
          WHEN rt.puntaje_total BETWEEN 7 AND 10 THEN '#00FF00'
          ELSE '#FF0000'
          END AS RESULTADO
    `;
    } else if (tipo_test_id == 3) {
      resultadoCase = `
          CASE
            WHEN rt.puntaje_total <= 9 THEN '#FF0000'
            WHEN rt.puntaje_total BETWEEN 10 AND 12 THEN '#FFFF00'
            WHEN rt.puntaje_total = 13 THEN '#00FF00'
            ELSE '#FF0000'
          END AS RESULTADO
    `;
    } else if (tipo_test_id == 4) {
      resultadoCase = `
          CASE
            WHEN rt.puntaje_total <= 9 THEN '#FF0000'
            WHEN rt.puntaje_total BETWEEN 10 AND 12 THEN '#FFFF00'
            WHEN rt.puntaje_total = 13 THEN '#00FF00'
            ELSE '#FF0000'
          END AS RESULTADO
    `;
    } else if (tipo_test_id == 5) {
    resultadoCase = `
        CASE
        WHEN rt.puntaje_total <= 9 THEN '#FF0000'
        WHEN rt.puntaje_total BETWEEN 10 AND 12 THEN '#FFFF00'
        WHEN rt.puntaje_total = 13 THEN '#00FF00'
        ELSE '#FF0000'
        END AS RESULTADO
    `;
    } else if (tipo_test_id == 6) {
      resultadoCase = `
          CASE
            WHEN rt.puntaje_total <=6 THEN '#FF0000'
            WHEN rt.puntaje_total BETWEEN 7 AND 10 THEN '#FFFF00'
            WHEN rt.puntaje_total BETWEEN 11 AND 14 THEN '#00FF00'
            ELSE '#FF0000'
          END AS RESULTADO
    `;
    } else {
      // Default
      resultadoCase = `
          CASE
          WHEN rt.puntaje_total >= 20 THEN '#00FF00'
          WHEN rt.puntaje_total >= 10 THEN '#FFFF00'
          ELSE '#FF0000'
          END AS RESULTADO
      `;
    }
    
    const selectFields = [
      "de.id AS estudiante_id",
      "rt.resultado_test_id",
      "CONCAT(de.nombre_estudiante, ' ', de.apellidos_estudiante) AS nombres",
      "c.nombre AS colegio",
      "g.nombre AS grado",
      "s.nombre AS seccion",
      "DATE_FORMAT(de.fecha, '%d/%m/%Y') AS fecha",
      "rt.puntaje_total AS puntaje",
      areaColumns,
      resultadoCase
    ].filter(Boolean).join(',\n  ');
    
    // Construir las condiciones WHERE
    const whereConditions = [];
    const params: (string | number)[] = [tipo_test_id];

    if (fechaInicio) {
      whereConditions.push('de.fecha >= ?');
      params.push(fechaInicio);
    }
    if (fechaFin) {
      whereConditions.push('de.fecha <= ?');
      params.push(fechaFin);
    }
    if (estudianteId) {
      whereConditions.push('de.id = ?');
      params.push(estudianteId);
    }
    if (gradoId) {
      whereConditions.push('de.grado_id = ?');
      params.push(gradoId);
    }
    if (seccionId) {
      whereConditions.push('de.seccion_id = ?');
      params.push(seccionId);
    }
    if (colegioId) {
      whereConditions.push('de.institucion_id = ?');
      params.push(colegioId);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    console.log('Condiciones WHERE:', whereConditions);
    console.log('Parámetros SQL:', params);
    
    const sql = `
    WITH resultados_por_area AS (
        SELECT 
            rt.estudiante_id,
            rt.id as resultado_test_id,
            gp.nombre as area_nombre,
            SUM(rt.puntaje) as puntaje_area
        FROM crecemos_website.resultados_test rt
        INNER JOIN crecemos_website.preguntas p ON rt.pregunta_id = p.id
        INNER JOIN crecemos_website.preguntas_grupo pg ON p.id = pg.pregunta_id
        INNER JOIN crecemos_website.grupos_preguntas gp ON pg.grupo_id = gp.id
        WHERE rt.tipo_test_id = ?
        GROUP BY rt.estudiante_id, rt.id, gp.nombre
    ),
    resultados_estudiante AS (
        SELECT 
            estudiante_id,
            MAX(resultado_test_id) as resultado_test_id,
            SUM(puntaje_area) as puntaje_total
        FROM resultados_por_area
        GROUP BY estudiante_id
    )
    SELECT
        ${selectFields}
    FROM crecemos_website.datos_estudiantes de
    INNER JOIN resultados_estudiante rt ON de.id = rt.estudiante_id
    LEFT JOIN resultados_por_area rpa ON rt.estudiante_id = rpa.estudiante_id
    LEFT JOIN crecemos_website.instituciones c ON de.institucion_id = c.id
    LEFT JOIN crecemos_website.grados g ON de.grado_id = g.id
    LEFT JOIN crecemos_website.secciones s ON de.seccion_id = s.id
    ${whereClause}
    GROUP BY de.id, de.nombre_estudiante, c.nombre, g.nombre, s.nombre, de.fecha, rt.resultado_test_id
    ORDER BY de.nombre_estudiante ASC
    `;

    console.log('SQL Query:', sql);
    console.log('Params:', params);

    const resultados = await this.dataSource.query(sql, params);
    console.log('Número de resultados:', resultados.length);
    
    // Agregar logs de depuración
    console.log('Primer resultado completo:', resultados[0]);
    console.log('Estructura de los resultados:', Object.keys(resultados[0]));
    
    // Verificar los campos específicos
    if (resultados.length > 0) {
      console.log('Campos específicos del primer resultado:');
      console.log('estudiante_id:', resultados[0].estudiante_id);
      console.log('nombres:', resultados[0].nombres);
      console.log('colegio:', resultados[0].colegio);
      console.log('grado:', resultados[0].grado);
      console.log('seccion:', resultados[0].seccion);
      console.log('fecha:', resultados[0].fecha);
      console.log('puntaje:', resultados[0].puntaje);
    }
    
    return resultados;
  }

  async eliminarEvaluacion(estudianteId: number, tipoTestId: number) {
    // Usamos una transacción para asegurar que ambas operaciones se completen
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Primero eliminamos todos los resultados del test asociados al estudiante
      await queryRunner.manager.delete(ResultadosTest, {
        estudiante: { id: estudianteId }
      });

      // Luego eliminamos los datos del estudiante
      await queryRunner.manager.delete(DatosEstudiante, {
        id: estudianteId
      });

      // Si todo sale bien, confirmamos la transacción
      await queryRunner.commitTransaction();
      
      return {
        mensaje: 'Evaluación eliminada exitosamente'
      };
    } catch (error) {
      // Si hay algún error, revertimos la transacción
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberamos el queryRunner
      await queryRunner.release();
    }
  }
} 