# Plan de Pruebas Comercial (Produccion) - New Mediterraneo

## Objetivo
Validar el flujo comercial completo en produccion desde la perspectiva de ventas y owner/admin, incluyendo: negocios, oportunidades, tareas, solicitudes, eventos, correos y reservas.

## Alcance
- CRM: Negocios, Oportunidades, Tareas
- Pipeline: cambios de etapa y actividad
- Solicitudes (booking requests): creacion, aprobacion/rechazo, estados
- Eventos y reservas
- Correos: envio de links de aprobacion/rechazo
- Permisos: ventas vs owner/admin

## Preparacion (Produccion)
1. Tener 2 usuarios:
   - **Ventas** (sales team)
   - **Owner/Admin**
2. Tener acceso al correo del negocio de prueba.
3. Usar navegador en modo incognito para el flujo publico (links de email).
4. Datos de prueba recomendados (marcar como PRUEBA en notas si existe el campo):
   - Negocio: **New Mediterraneo**
   - Contacto: **Ana Gomez**
   - Email: **ana+newmediterraneo@tu-dominio.com**
   - Telefono: **+507 6000-0000**
   - Categoria: **Restaurantes**

---

## Flujo A-Z (Ventas)

### Paso 1: Crear negocio
**Objetivo:** crear el negocio base.
1. Ir a **Negocios** (`/businesses`).
2. Click en **Nueva Empresa**.
3. Completar campos requeridos:
   - Nombre: **New Mediterraneo**
   - Contacto: **Ana Gomez**
   - Email: **ana+newmediterraneo@tu-dominio.com**
   - Telefono: **+507 6000-0000**
   - Categoria: **Restaurantes**
   - Sales Team: **Inside Sales** (o **Outside Sales** segun corresponda)
4. Guardar.

**Resultado esperado:**
- Negocio creado y visible en la lista.
- Se puede abrir el detalle del negocio.

---

### Paso 2: Crear oportunidad desde negocio
**Objetivo:** crear oportunidad y validar responsable por defecto.
1. En la lista de negocios, ubicar **New Mediterraneo**.
2. Click en el icono de crear oportunidad (handshake/acciones).
3. Verificar en el formulario:
   - **Responsable** preseleccionado con el usuario actual (ventas).
   - Etapa inicial: **Iniciacion**.
4. Probar validacion:
   - Limpiar responsable y verificar que el boton **Guardar** quede deshabilitado.
5. Completar y guardar:
   - Notas: `PRUEBA - contacto inicial`

**Resultado esperado:**
- Oportunidad creada y vinculada al negocio.
- No se puede guardar sin responsable.

---

### Paso 3: Crear tareas en la oportunidad
**Objetivo:** registrar actividad y validar contexto en el modal de tareas.
1. Abrir la oportunidad de **New Mediterraneo**.
2. Ir a la pestaña **Actividad**.
3. Crear **Tarea (To-do)**:
   - Titulo: `Llamada de seguimiento`
   - Fecha: manana
   - Notas: `PRUEBA - confirmar interes`
4. Crear **Reunion**:
   - Con: `Maria Gonzalez`
   - Posicion: `Gerente General`
   - Es decisor: `Si`
   - Detalle: `PRUEBA - revisar propuesta`
   - Fecha: proxima semana
5. Verificar en el modal:
   - Muestra responsable y negocio.
   - Nombre del negocio es clickable y abre la oportunidad.

**Resultado esperado:**
- Ambas tareas aparecen en la lista.
- Contexto de negocio/responsable visible.

---

### Paso 4: Avanzar etapas del pipeline
**Objetivo:** validar cambios de etapa y actividad.
1. Cambiar etapa: **Iniciacion** -> **Reunion**.
2. Completar la tarea de reunion y registrar resultado.
3. Cambiar etapa: **Propuesta Enviada** -> **Propuesta Aprobada** -> **Won**.

**Resultado esperado:**
- Etapas actualizan correctamente.
- Se registra actividad en el log.
- Al completar reunion, aparece el prompt de "marcar como Won".

---

### Paso 5: Crear solicitud desde oportunidad ganada
**Objetivo:** crear booking request con datos prellenados.
1. Con oportunidad en **Won**, click **Crear Solicitud**.
2. Verificar campos prellenados del negocio.
3. Completar:
   - Nombre del deal: `Oferta New Mediterraneo`
   - Fechas: inicio mes siguiente, fin +3 meses
   - Detalles y precios segun plantilla
4. Click **Enviar** (no borrador).

**Resultado esperado:**
- Solicitud creada en estado **pending**.
- Evento pendiente creado.
- Email enviado al contacto.

---

### Paso 6: Validar email y aprobacion publica
**Objetivo:** confirmar envio de correo y flujo publico.
1. Abrir el email del contacto.
2. Verificar links de **Aprobar** y **Rechazar**.
3. Click **Aprobar**.
4. Verificar pagina publica de confirmacion.
5. En la app, ir a **Solicitudes** (`/booking-requests`).

**Resultado esperado:**
- Solicitud pasa a **approved**.
- Evento pasa a **approved**.

---

### Paso 7: Reservar evento y crear deal
**Objetivo:** confirmar booking final y creacion de deal.
1. Ir a **Eventos** (`/events`).
2. Abrir el evento aprobado.
3. Click **Reservar**.
4. Verificar:
   - Evento y solicitud en estado **booked**.
   - Nuevo deal en **Deals** (`/deals`).
   - Si existe marketing, se crea campana.

**Resultado esperado:**
- Deal creado y vinculado.
- Estados correctos.

---

### Paso 8: Flujo alterno de rechazo
**Objetivo:** validar rechazo desde email.
1. Crear un segundo negocio/oportunidad (mismo flujo).
2. Enviar solicitud.
3. Abrir email y click **Rechazar**.
4. Completar razon de rechazo.

**Resultado esperado:**
- Solicitud **rejected**.
- Evento en **rejected**.
- Razon visible.

---

## Validaciones de Permisos (Owner/Admin)

### Paso 9: Aprobacion directa por admin
1. Ingresar como **Owner/Admin**.
2. Abrir una solicitud **pending**.
3. Verificar boton **Aprobar** visible.
4. Aprobar desde la app.

**Resultado esperado:**
- Admin puede aprobar.
- Usuario de ventas no ve este boton.

---

## Checklist Final (Ventas)
- Negocio creado y visible.
- Oportunidad creada y vinculada.
- Responsable obligatorio y por defecto.
- Tareas creadas con contexto visible.
- Pipeline avanza sin errores.
- Solicitud enviada y estado pending.
- Email recibido con links validos.
- Aprobacion cambia estados a approved.
- Reserva final crea deal.
- Rechazo funciona y guarda razon.

---

## Notas de Produccion
- Etiquetar datos de prueba con `PRUEBA` en notas para identificar y limpiar luego.
- Usar correos controlados por el equipo.
- Confirmar impacto externo (API, marketing, facturacion) antes de reservar.
