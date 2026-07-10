# MASTER PROMPT — SGD SUOC v2: Sistema de Gestión Documental para Hostinger

> **Instrucciones de uso:** copiá TODO este documento y pegalo como primer mensaje en una sesión nueva de Claude. Tené a mano el archivo `datos_sgd.json` (exportación del sistema anterior) para cuando la sesión llegue a la fase de importación.

---

Actuá como un desarrollador full-stack senior y arquitecto de software. Vas a construir desde cero, completo y listo para producción, un **Sistema de Gestión Documental (SGD)** para la **Sub Unidad Operativa de Contrataciones (SUOC) del Hospital General de Luque, Paraguay**. Usuario único: el encargado de la SUOC.

## 1. Contexto y filosofía de diseño

El usuario es el encargado de la SUOC y actúa como puente entre el Hospital y la Dirección Operativa de Contrataciones (DOC) del MSPBS. Existe un sistema anterior en Django que funcionaba, pero fue parcheado muchas veces y modelaba mal el flujo real. **Esta reconstrucción NO es una migración de código: es un rediseño limpio.** Reglas de oro:

- Modelar el flujo real descrito abajo, no el del sistema viejo.
- Diseño simple: es un sistema personal de un solo usuario. Nada de roles, permisos complejos ni features especulativas.
- Ante cualquier ambigüedad: **preguntar antes de asumir**. El usuario no es programador profesional; explicale las configuraciones externas (GitHub, hPanel) clic por clic.
- Tenés libertad de **proponer mejoras y optimizaciones**, pero se implementan **solo tras la confirmación explícita del usuario, de a una por vez**.

### El flujo real de trabajo (fuente de verdad)

1. El jefe del Departamento Administrativo del Hospital le **deriva expedientes/notas** al usuario. Cada expediente llega con un **número de mesa de entrada** asignado por el Depto. Administrativo, y el usuario le asigna además **su propio número correlativo SUOC** (formato `N/AÑO`, se reinicia cada año — esto es lo único que el sistema numera automáticamente).
2. La mayoría son **solicitudes de compra de insumos**: si los insumos están en la tienda virtual del portal de contrataciones públicas, el usuario lo **gestiona por el portal**. Si es compra de equipo médico, genera documentos que acompañan una **nota nueva dirigida a la Dirección General de Gestión de Insumos Estratégicos en Salud**. Otros pedidos van a **otras Direcciones según corresponda**. También gestiona reparaciones de equipos y otros asuntos.
3. **El expediente original queda archivado en la SUOC.** Lo que sale es una **nota nueva** sobre el asunto, dirigida a la Dirección pertinente, con copia del expediente adjunta. Las notas de salida **no las numera el usuario**: las numera el Departamento Administrativo o la Dirección General, **según quién firme** la nota (por eso el número de nota se carga manualmente, y se registra por qué vía salió/quién firmó).
4. Un expediente puede generar **varias salidas** (una nota, luego otra, una gestión por portal, etc.).

## 2. Plataforma destino (restricción dura)

Deploy en **Hostinger, plan Cloud Startup, función "Deploy Web App"** (hPanel):

- Solo **Node.js** (18/20/22/24). Recomendado: **Next.js (App Router) + TypeScript** como full-stack.
- Deploy conectando un **repositorio de GitHub** (build y deploy automáticos). Todo en un solo repo.
- **Sin SSH** ni comandos manuales en el servidor: migraciones de esquema y seeds deben correr en el build, el arranque, o vía ruta de administración protegida.
- Base de datos: **MySQL de Hostinger** (incluida en el plan), conexión por variables de entorno, `utf8mb4`. ORM recomendado: **Prisma**.
- Adjuntos PDF: almacenados de forma compatible con la plataforma (disco persistente del plan o BLOB en MySQL — evaluá y proponé, considerando que serán pocos y livianos).
- Secretos SOLO en variables de entorno (`.env.example` documentado).

Interfaz **100% en español**, zona horaria **America/Asuncion**, fechas `dd/mm/aaaa`, moneda **Guaraníes (Gs.)** formato es-PY. Responsive: se usará desde el celular.

## 3. Modelo de datos

Diseñá el esquema definitivo vos (con nombres limpios y consistentes), respetando estas entidades y reglas. `DECIMAL(15,2)` para montos.

### 3.1 Catálogos (todos editables desde el sistema)

- **Estado**: nombre (único), orden (int, define la secuencia), es_final (bool — un expediente en estado final no admite más cambios).
- **TipoDocumento**: nombre (único).
- **Servicio** (servicio hospitalario de origen del pedido: Farmacia, Laboratorio, Mantenimiento…): nombre (único). Incluir una entrada "No aplica" en el seed.
- **Destino** (Direcciones a las que salen las notas: DOC/MSPBS, Dir. Gral. de Gestión de Insumos Estratégicos en Salud, etc.): nombre (único). **Nuevo respecto al sistema viejo.**

### 3.2 Expediente (documento entrante) — núcleo

- `nro_mesa_entrada`: N° de mesa de entrada del Depto. Administrativo (string, requerido).
- `nro_suoc`: correlativo propio `N/AÑO` — **generado automáticamente** (regla RN-1), con opción de asignarlo manualmente al crear.
- `año_suoc`: derivado de la fecha de ingreso a SUOC (para la unicidad y el reinicio anual).
- `nro_simese`: referencia SIMESE (string, opcional).
- `fecha_ingreso_adm` (fecha/hora de entrada al Depto. Administrativo) y `fecha_ingreso_suoc` (fecha/hora de entrada a la SUOC).
- `tipo_documento` (FK catálogo), `servicio_origen` (FK catálogo).
- `asunto` (texto, requerido): objeto o resumen del expediente.
- `monto_estimado` (opcional).
- `estado_actual` (FK Estado), `fecha_ultima_actualizacion` (automática).
- `adjunto`: PDF opcional (el expediente escaneado).
- Restricción única: (`nro_suoc`, `año_suoc`).
- Borrado: los expedientes con salidas o trazabilidad no se eliminan físicamente sin confirmación fuerte; los catálogos referenciados nunca se borran (RESTRICT).

### 3.3 Salida (gestión realizada sobre un expediente) — **nuevo, corazón del rediseño**

Un expediente tiene 0..N salidas. Cada salida:

- `tipo`: **NOTA** (nota nueva a una Dirección) | **PORTAL** (gestión en tienda virtual/portal de contrataciones) | **OTRO**.
- `fecha` (requerida).
- Si es NOTA: `destino` (FK catálogo Destino), `nro_nota` (string, **manual** — lo asigna quien firma), `firmada_por` (por qué vía salió: "Departamento Administrativo", "Dirección General" u otro — catálogo simple o campo con sugerencias).
- Si es PORTAL: `referencia` (texto libre — el usuario anota ID de proceso, N° de orden de tienda virtual, etc.).
- `descripcion` (texto: qué se gestionó/qué acompaña).
- `adjunto`: PDF opcional (la nota firmada, por ejemplo).

### 3.4 Trazabilidad (historial de estados)

- `expediente` (FK), `estado_anterior` (FK), `estado_nuevo` (FK), `fecha_cambio` (automática = momento del registro), `observaciones` (opcional).

### 3.5 Usuario

Un solo usuario con login (usuario + contraseña hasheada con bcrypt/argon2). Sesión con cookie segura. Rate-limit en el login. Sin roles.

## 4. Reglas de negocio

- **RN-1 · Numeración SUOC**: al crear un expediente sin número manual, asignar `(máximo correlativo del año de fecha_ingreso_suoc) + 1` con formato `N/AÑO`. Reinicio anual. A prueba de concurrencia (transacción + unicidad + reintento). Tras importar datos viejos, la numeración continúa desde el máximo existente del año.
- **RN-2 · Cambio de estado**: desde el detalle del expediente; crea el registro de trazabilidad (estado anterior → nuevo, fecha automática, observaciones) y actualiza `estado_actual` y `fecha_ultima_actualizacion` en la misma transacción. Estado final ⇒ no se admiten más cambios (la UI lo bloquea y el servidor lo valida). Estado inicial al crear: el de menor `orden` del catálogo.
- **RN-3 · Salidas**: registrar una salida NO cambia el estado por sí solo, pero la pantalla debe ofrecer ("¿querés también actualizar el estado?") el cambio de estado en el mismo paso, para no duplicar trabajo.
- **RN-4 · Validaciones de servidor SIEMPRE**: campos requeridos según tipo de salida, fechas coherentes (ingreso SUOC ≥ ingreso Adm; avisar si difieren mucho), PDF: solo application/pdf, tamaño máximo razonable (proponé límite).

## 5. Pantallas

1. **Inicio / Panel**: lo primero que se ve al entrar: **expedientes pendientes (estado no final) ordenados por antigüedad**, mostrando días desde el ingreso a SUOC con indicador visual de envejecimiento (ej.: verde < 7 días, amarillo 7-15, rojo > 15 — proponé umbrales y validalos con el usuario), y **buscador rápido** siempre visible.
2. **Búsqueda**: instantánea, por N° SUOC (entendiendo formatos `N/AA` y `N/AAAA`), N° de mesa de entrada, SIMESE, asunto y texto de salidas. Es la función que más usa cuando le preguntan "¿qué pasó con la nota tal?".
3. **Nuevo expediente**: formulario ágil (lo usa varias veces al día): número SUOC autogenerado visible, catálogos como selects con búsqueda, adjunto opcional.
4. **Detalle del expediente**: toda la historia en una pantalla: datos, adjunto, **salidas registradas** (cronológicas, con sus adjuntos), **historial de trazabilidad**, y acciones: registrar salida, cambiar estado, editar datos.
5. **Listado de expedientes**: con filtros por año, estado, tipo, servicio; orden por defecto: ingreso SUOC descendente.
6. **Reporte de productividad**: tiempo de permanencia de cada expediente en cada estado (desde `fecha_ingreso_suoc` encadenando la trazabilidad; el estado vigente acumula hasta ahora), tabla expediente × estados en formato `Xd Yh Zm`. Filtrable por año.
7. **Administración**: CRUD de los 4 catálogos + cambio de contraseña + **respaldo**: botón que descarga toda la base como JSON (equivalente al `dumpdata` viejo).

## 6. Importación de datos del sistema anterior

Los datos llegan como export de Django (`datos_sgd.json`, formato `dumpdata`): array de `{"model": "...", "pk": ..., "fields": {...}}`. Construí un importador (script `npm run import` o ruta admin protegida) que:

- Importe SOLO: `contrataciones.estado`, `contrataciones.servicio`, `contrataciones.tipodocumento`, `contrataciones.documento`, `contrataciones.trazabilidad`. **Ignorá el resto de los modelos** (procesos licitatorios, contratos, órdenes, notas de remisión, usuarios, etc. — quedan fuera del alcance; no fallar por su presencia).
- Mapeos del modelo viejo `documento` → Expediente: `nro_exp_adm` → `nro_mesa_entrada`; `nro_exp_suoc` → `nro_suoc` (**preservar tal cual**); `año_ingreso` (ojo: la clave viene con ñ) → `año_suoc`; `nro_documento` → `nro_simese`; `objeto_o_resumen` → `asunto`; `tipo_documento`, `servicio`, `estado_actual`, fechas y `monto_estimado` directo. El campo viejo `responsable_actual` puede descartarse (sistema de un solo usuario).
- Fechas en ISO-8601 UTC → convertir a almacenamiento correcto para mostrarse en hora paraguaya.
- Preservar los vínculos de trazabilidad (vienen por PK).
- Idempotente (re-ejecutable sin duplicar) y con resumen final de lo importado/omitido.

## 7. Mejoras para proponer al usuario (NO implementar sin su confirmación, de a una)

1. Alerta de expedientes estancados (sin movimiento hace N días) en el panel.
2. Seguimiento de respuesta: marcar una salida como "espera respuesta" y avisar si pasan N días sin registrarla.
3. Exportar listados y el reporte de productividad a Excel/PDF para informes al administrador.
4. Estadísticas por período (entradas por mes, por tipo, por servicio, resueltos vs pendientes).
5. Respaldo automático periódico además del manual.
6. Plantillas de texto para las notas de salida más frecuentes.

## 8. Calidad y seguridad

- Tests automáticos obligatorios de: RN-1 (correlativo, reinicio anual, concurrencia, continuidad post-importación), RN-2 (transaccionalidad, bloqueo de estado final) y el importador (con fixture de ejemplo del formato dumpdata).
- TypeScript tipado, validación en servidor con mensajes en español, manejo de errores amable (nada de stack traces al usuario).
- HTTPS asumido (lo provee Hostinger), cookies `Secure`/`HttpOnly`, CSRF, headers de seguridad.
- README con: variables de entorno, conexión del repo a Deploy Web App paso a paso, cómo correr migraciones/seed sin SSH, cómo ejecutar la importación y cómo restaurar un respaldo.

## 9. Criterios de aceptación

- [ ] Deploy funcionando en Hostinger Deploy Web App con MySQL de Hostinger.
- [ ] Crear 2 expedientes seguidos → `N/AÑO` y `N+1/AÑO`; con año nuevo, reinicia en `1/AÑO`.
- [ ] Registrar una salida tipo NOTA con destino, número manual y firmante; y otra tipo PORTAL con referencia libre — ambas visibles en el detalle.
- [ ] Cambio de estado genera trazabilidad; estado final bloquea nuevos cambios.
- [ ] Importación completa: expedientes viejos con sus números SUOC intactos, historial de trazabilidad ligado, numeración continúa desde el máximo del año.
- [ ] Panel muestra pendientes por antigüedad; búsqueda encuentra por `N/AA`, mesa de entrada y asunto.
- [ ] Reporte de productividad coherente con la trazabilidad.
- [ ] Adjuntar un PDF a un expediente y a una salida, y volver a descargarlos.
- [ ] Respaldo JSON descargable.
- [ ] Todos los tests pasan.

## 10. Cómo trabajar

Presentá primero un plan por fases (setup → esquema/migraciones → auth → expedientes + numeración → salidas → trazabilidad → panel/búsqueda → reporte → importador → adjuntos → deploy) y validalo con el usuario antes de codear. Después de cada fase, mostrale qué se construyó y confirmá antes de seguir. Las mejoras de la sección 7 se ofrecen al final, una por una. Ante cualquier duda sobre el negocio: preguntá — el usuario conoce su operación mejor que nadie.
