<!--
Lineamiento de modificaciones entregado por la escuela el 2026-09-23. Se guarda tal
como llego (el original se corta en la seccion 5.1, a mitad del wireframe).
Como se reconcilia con docs/DOMAIN.md y que se implementa: .claude/PRPs/PRP-002-ritmo-por-nino.md
-->

# Especificación de Producto y UX/UI: Sistema de Gestión Waldorf Kimün (Algarrobo)

> **Documento de Requerimientos, Arquitectura y Diseño para Agente de Código / Frontend Developer**
>
> **Proyecto:** Rediseño y Modernización de la Plataforma de Gestión Comunitaria Waldorf Kimün
>
> **Ubicación e Identidad:** Camino a El Totoral, Algarrobo, Chile — [waldorfkimun.cl](https://www.waldorfkimun.cl/?utm_source=gemini)
>
> **Niveles Escolares:** 
> - **Jardín Infantil:** Grupo Semilla (2,5 a 6 años)
> - **Educación Básica:** 1° a 8° básico
> - **Educación Media:** Proyección ciclo superior

---

## 1. Contexto Pedagógico, Filosofía y Diagnóstico

### 1.1. Filosofía Waldorf y el Concepto de "Ritmo"
En la pedagogía Waldorf, el ritmo no es un simple horario de clases; es la respiración del desarrollo humano (alternancia entre contracción/concentración y expansión/juego libre):
* **Diferenciación por Etapa de Desarrollo:**
  * **Grupo Semilla (Jardín / Primer Septenio):** El ritmo se estructura en torno a la imitación, el juego libre en la naturaleza, rondas, panificación, cuentos de hadas y el cereal diario. No existen "materias" ni "épocas académicas".
  * **Básica y Media (Segundo y Tercer Septenio):** El ritmo diario se estructura alrededor de la **Clase Principal (Época)** de 2 horas (bloques de 3 a 5 semanas de una misma disciplina: mitología, geometría, historia, huerto, etc.), seguida de materias especiales (euritmia, música, idiomas, tejido/manualidades).
* **Cereales y Días de la Semana:**
  * Lunes: Arroz (Luna)
  * Martes: Cebada / Legumbres (Marte)
  * Miércoles: Mijo (Mercurio)
  * Jueves: Centeno (Júpiter)
  * Viernes: Avena (Venus)

### 1.2. Diagnóstico del Sistema Actual
* **CRUD tradicional rígido:** Formularios permanentes de gran tamaño expuestos en pantallas principales (`Nuevo encuentro`, `Crear un anio`, `Invitar a alguien`).
* **Falta de segmentación por niño/ciclo:** El sistema actual asume un ritmo plano y único para todo el colegio, lo cual no refleja la realidad pedagógica (un apoderado con un hijo en Semilla y otro en Básica necesita información radicalmente distinta).
* **Sensación de hoja de cálculo:** Tablas frías sin microinteracciones, sin modales fluidos ni adaptabilidad mobile.

---

## 2. Modelo de Datos y Relaciones Clave

```text
[ Familia / Apoderado (User) ]
         │ (1 a N)
         ▼
    [ Alumno ]
         │ (N a 1)
         ▼
     [ Curso ] ─── (Ciclo: 'semilla' | 'basica' | 'media')
         │
         ├─── (1 a N) ──► [ Ritmo Diario/Semanal ] (Editado por Profesora)
         └─── (1 a N) ──► [ Época Pedagógica ] (Solo Básica/Media)
```

### 2.1. Entidades Principales

#### `User` (Familia / Apoderado, Maestro/Guía, Administrador)
* `id`: UUID
* `name`: String
* `email`: String (opcional en primer onboarding)
* `role`: `'familia' | 'profesor' | 'admin'`
* `phone`: String

#### `Student` (Alumno / Hijo)
* `id`: UUID
* `first_name`: String
* `last_name`: String
* `guardian_id`: UUID (relación con `User` apoderado)
* `course_id`: UUID (relación con `Course`)

#### `Course` (Curso / Grado)
* `id`: UUID
* `name`: String (ej. "Grupo Semilla", "3° Básico")
* `cycle`: `'semilla' | 'basica' | 'media'`
* `lead_teacher_id`: UUID (Profesora jefe / Guía titular)

#### `Rhythm` (El Ritmo)
* `id`: UUID
* `course_id`: UUID
* `week_start_date`: Date
* `cycle_type`: `'semilla' | 'basica' | 'media'`
* `daily_data`: JSONB
  * *Estructura para Semilla:*
    ```json
    {
      "lunes": { "cereal": "Arroz", "actividad": "Lavado de lana / Pintura acuarela", "colacion": "Pan amasado y fruta seca", "nota_maestra": "Traer botas de agua para el bosque." }
    }
    ```
  * *Estructura para Básica/Media:*
    ```json
    {
      "lunes": { "cereal": "Arroz", "clase_principal_epoca": "Historias y Leyendas", "materias": ["Lenguaje", "Euritmia", "Alemán"], "materiales": "Cuaderno de época y témperas." }
    }
    ```

#### `Epoch` (Época Pedagógica - Básica y Media)
* `id`: UUID
* `course_id`: UUID
* `title`: String (ej. "Construcción y Oficios", "Botánica")
* `start_date`: Date
* `end_date`: Date
* `description`: Text
* `status`: `'proxima' | 'activa' | 'finalizada'`

---

## 3. Experiencia de Usuario (UX) y Flujos Críticos

### 3.1. Flujo Familiar: Switcher de Hijos y Vista Contextual

Un apoderado no debe configurar cursos ni navegar menús complejos. Al abrir la app (principalmente en smartphone):

```text
[ Acceso Apoderado ]
        │
        ▼
¿Tiene más de 1 hijo matriculado?
   ├── SÍ: Muestra "Child Switcher" en cabecera:
   │       [ 🌿 Isidora (Grupo Semilla) ] | [ 📖 Mateo (3° Básico) ]
   └── NO: Carga directa sin selector extra.
        │
        ▼
[ Renderizado Dinámico del Ritmo ]
   │
   ├── Si está seleccionado hijo de GRUPO SEMILLA:
   │    • Banner suave con el Cuento/Arquetipo de la semana.
   │    • Tira interactiva del Cereal & Actividad del hogar/jardín.
   │    • Recordatorio de ropa/materiales para la naturaleza.
   │    • Cero mención a asignaturas formales o calificaciones.
   │
   └── Si está seleccionado hijo de BÁSICA / MEDIA:
        • Banner de Época Activa (ej. "Historias y Leyendas", barra de progreso semanal).
        • Tira del Cereal + Horario de la Clase Principal y Materias del día.
        • Avisos de entregas de cuadernos o salidas pedagógicas.
```

### 3.2. Flujo Profesora: Carga y Actualización del Ritmo

La profesora o maestro guía tiene una interfaz especializada, rápida y sin formularios extensos:

1. **Selección de Curso:** Al entrar a la sección `Mi Curso / Ritmo`, la profesora visualiza el grado a su cargo (o dropdown si administra más de uno).
2. **Plantilla Adaptativa Automática:**
   * Si el curso es **Semilla**, los campos de carga son:
     * *Ronda / Cuento del ciclo*
     * *Actividad del día (panificación, huerto, acuarela, juego en bosque)*
     * *Colación comunitaria / Cereal*
     * *Notas para las familias (ej. cambio de muda, abrigo)*
   * Si el curso es **Básica**, los campos de carga son:
     * *Época actual asociada (selector de época vigente)*
     * *Tema de la semana de la clase principal*
     * *Materias especiales del día*
     * *Materiales requeridos en el aula*
3. **Edición Rápida (Inline / Drawer):**
   * Puede editar el día con un solo clic sobre la tarjeta de la semana.
   * Botón `Publicar Ritmo para Familias` con notificación inmediata.

### 3.3. Flujo Onboarding Familia vía WhatsApp (Admin / Gestor)

1. Admin hace clic en `+ Sumar Familia` (abre Drawer lateral).
2. Completa:
   * Nombre de los padres.
   * Nombre del estudiante y curso al que ingresa (`Grupo Semilla`, `1° Básico`, etc.).
   * *(Opcional)* Añadir hermano/a adicional en el mismo acto.
3. El sistema genera un **Link Mágico** con token firmado.
4. Botón `Enviar por WhatsApp` que abre la app con el mensaje personalizado:
   > *"¡Hola Familia! Les damos la bienvenida a Waldorf Kimün Algarrobo. Creen su acceso para acompañar el ritmo de [Nombre Niño] aquí: https://kimun.app/invitacion/[token]"*
5. El apoderado entra al enlace, define contraseña y aterriza directamente con sus hijos ya vinculados.

---

## 4. Sistema de Diseño (Design System: "Digital Orgánico")

### 4.1. Tokens de Color Kimün
* **Fondos:**
  * Base lienzo: `#FAF7F2` (Lino crudo / Papel de algodón)
  * Tarjetas / Superficies: `#FFFFFF`
  * Tarjeta Día Activo: `#FDF6EC` con borde `#D99B43`
* **Colores Primarios de Identidad:**
  * `Primary Dark`: `#6B4C35` (Madera oscura, títulos serif)
  * `Primary Default`: `#8C5A3C` (Tierra / Arcilla suave, botones primarios)
  * `Primary Hover`: `#543826`
* **Colores de Acento y Ciclos:**
  * `Semilla Accent` (Verde Brote / Salvia): `#5E7A5E`
  * `Básica Accent` (Ocre Dorado / Sol): `#D99B43`
  * `Media Accent` (Terracota Cálido): `#B85B43`
  * `Bordes neutros`: `#E8E0D2`
  * `Texto Body`: `#2C2623` (Máximo contraste natural)
  * `Texto Muted`: `#7A7067`

### 4.2. Tipografía
* **Títulos y Encabezados:** Serif cálida humana (`Lora` o `Fraunces`).
* **Interfaces, Botones, Inputs y Datos:** Sans-serif moderna y limpia (`Plus Jakarta Sans` o `Inter`).

### 4.3. Componentes Visuales
* **Child Switcher (Selector de Hijos):**
  * Pill buttons flotantes en el header superior.
  * Estado inactivo: borde `#E8E0D2`, texto `#7A7067`, fondo transparente.
  * Estado activo: fondo blanco con sombra tenue, borde con el color temático del ciclo (`#5E7A5E` para Semilla, `#D99B43` para Básica) y avatar o icono correspondiente (`Sprout` o `BookOpen`).
* **Tarjetas de Cereal Semanal:**
  * Disposición horizontal desplazable en mobile (`flex gap-3 overflow-x-auto snap-x`).
  * Indicador visual de "Hoy" con micro-badge animado.
* **Drawers y Modales:**
  * Uso de *Side Drawers* (paneles deslizantes laterales) para carga y formularios, evitando formularios incrustados en la página principal.

---

## 5. Especificación de Pantallas y Wireframes

### 5.1. Vista Principal Apoderado (Mobile / Desktop)

```text
+-----------------------------------------------------------------------------------+
|  🌿 Waldorf Kimün Algarrobo                                          (👤 Camila)  |
|                                                                                   |
|  Seleccionar Alumno:                                                              |
|  [ 🟢 Isidora · Grupo Semilla (Activo) ]   [ ⚪ Mateo · 4° Básico ]               |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  HOY ES MIÉRCOLES (Cereal del día: Mijo)                                          |
|                                                                                   |
|  [ RITMO DE LA SEMANA - GRUPO SEMILLA ]                                           |
|  +-----------+  +-----------+  +-------------------+  +-----------+  +----------