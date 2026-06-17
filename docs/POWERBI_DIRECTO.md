# Power BI conectado en vivo a la fuente (sin ETL intermedio)

Energía Abierta (`energiaabierta.cl`) corre sobre **CKAN**, que expone una API REST
en `/api/3/action/` y devuelve **JSON**. Power BI se conecta directamente con el
conector **Web**, pagina los registros y se **refresca de forma nativa** (incluso
programado en Power BI Service, sin Gateway, por ser un origen web público).

> Ventaja: corre en tu máquina/servicio con internet, así que **no depende de este
> repositorio ni de la red restringida del entorno remoto**.

---

## Paso 1 — Descubrir el `resource_id` de cada dataset

CKAN identifica cada tabla con un `resource_id`. Para encontrarlo, abre en el
navegador (o en Power BI → **Obtener datos → Web**) una búsqueda `package_search`:

```
https://datos.energiaabierta.cl/api/3/action/package_search?q=capacidad%20instalada
```

> Si ese host no responde, prueba con `https://energiaabierta.cl` (mismo path).

En el JSON, dentro de `result → results → resources`, busca el recurso cuyo
campo **`datastore_active` = true** y copia su **`id`** (un UUID). Ese es tu
`resource_id`. Términos de búsqueda sugeridos por módulo:

| Módulo | `q=` (búsqueda) |
|--------|------------------|
| Capacidad instalada | `capacidad instalada` |
| Generación | `generacion bruta` |
| ERNC | `generacion bruta ERNC` |
| PMGD | `PMGD` |
| Demanda | `demanda electrica` |

(Haces esto **una vez** por tabla; el `resource_id` es estable.)

---

## Paso 2 — Consulta Power Query con paginación

En Power BI: **Inicio → Transformar datos → Nuevo origen → Consulta en blanco →
Editor avanzado**, y pega esto (cambia `ResourceId` por el UUID del Paso 1):

```powerquery-m
let
    Base       = "https://datos.energiaabierta.cl",
    ResourceId = "PEGA-AQUI-EL-UUID",
    PageSize   = 10000,

    // Trae una página del DataStore (RelativePath/Query = compatible con refresco)
    GetPage = (offset as number) as list =>
        let
            Resp = Json.Document(
                Web.Contents(Base, [
                    RelativePath = "/api/3/action/datastore_search",
                    Query = [
                        resource_id = ResourceId,
                        limit       = Text.From(PageSize),
                        offset      = Text.From(offset)
                    ]
                ])
            ),
            Registros = Resp[result][records]
        in
            Registros,

    // Itera páginas hasta que una venga vacía
    Paginas = List.Generate(
        () => [off = 0, recs = GetPage(0)],
        each List.Count([recs]) > 0,
        each [off = [off] + PageSize, recs = GetPage([off] + PageSize)],
        each [recs]
    ),

    Todos  = List.Combine(Paginas),
    Tabla  = Table.FromRecords(Todos)
in
    Tabla
```

Luego, en el Editor, **expande** las columnas, fija los **tipos** (fecha como
*Fecha*, `potencia_mw`/`energia_gwh` como *Número decimal*) y **Cerrar y aplicar**.

> Duplica esta consulta una vez por tabla cambiando solo `ResourceId`. Para no
> repetir el bloque, conviértelo en **función** (`(ResourceId) => ...`) y llámala
> desde cada consulta.

---

## Paso 3 — Datos legislativos (Senado y Cámara devuelven XML)

Estas fuentes no son CKAN: entregan **XML**, que Power Query lee con `Xml.Tables`.

**Senado** (proyectos en tramitación):
```powerquery-m
let
    Fuente = Xml.Tables(
        Web.Contents("https://tramitacion.senado.cl", [
            RelativePath = "/wspublico/tramitacion.php"
        ])
    )
in
    Fuente
```

**Cámara de Diputadas y Diputados** (proyectos de ley por año):
```powerquery-m
let
    Anno   = "2026",
    Fuente = Xml.Tables(
        Web.Contents("https://opendata.camara.cl", [
            RelativePath = "/camaradiputados/WServices/WSLegislativo.asmx/retornarProyectosLeyXAnno",
            Query = [ prmAnno = Anno ]
        ])
    )
in
    Fuente
```

Filtra después por los temas energéticos (energía, PMGD, transmisión, hidrógeno
verde, almacenamiento, permisología, etc.).

---

## Paso 4 — Refresco programado

1. Publica el `.pbix` en **Power BI Service**.
2. En el dataset → **Configuración → Actualización programada**, define la
   frecuencia (p. ej. diaria, en la mañana, después de que la CNE publica).
3. Como los orígenes son **APIs web públicas (anónimas)**, normalmente **no
   requieren Gateway**. Si Power BI lo pide, marca el nivel de privacidad del
   origen como **Público** / **Anónimo** en *Credenciales del origen de datos*.

---

## ¿Cuándo usar este método vs. el ETL del repo?

| | API directa (este doc) | ETL del repo + export |
|---|---|---|
| Infraestructura | Solo Power BI | Python + (opcional) PostgreSQL |
| Limpieza/normalización | La haces en Power Query | Ya viene hecha (regiones, tecnologías, ERNC) |
| Alertas / proyectos de ley cruzados | Manual | Automatizado (`docs/POWERBI.md`) |
| Mejor para | Exploración rápida y refresco nativo | Producto de monitoreo completo |

Para análisis directo y refresco simple, **este método**. Si más adelante quieres
la capa de transformación, alertas y trazabilidad, despliega el ETL en un equipo
con internet (ver `docs/POWERBI.md`, métodos 3 y 4).
