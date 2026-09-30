## Weather CLI APP

El objetivo de esta aplicación es que creemos una aplicación de consola que pida que ingresemos la ciudad, Al final, generaremos un binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.

## Stack

- Bun.js
- OpenMeteo

## Ejemplo de petición http:

1. Paso 1: Geocoding API.
2. Paso 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=5&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Comandos

```bash
bun run start       # ejecutar
bun run build       # binario
bun run test        # tests
bun run typecheck   # typecheck
```

### Ejemplo del menú
Esta es la apariencia que deseamos crear

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  6. Pronóstico de 7 días (ciudad default)
  7. Pronóstico de 7 días de todas (1)
  8. Ajustes (°C)
  9. Salir
════════════════════════════════════════
  Selecciona una opción: 5
```

### Buscar ciudades

El geocoding devuelve hasta 5 coincidencias. La app las lista numeradas con sus
coordenadas para que elijas la correcta, ya que hay nombres repetidos
("Springfield" existe en Missouri, Illinois, Massachusetts, Ohio y Tennessee; y
"Morelia" aparece tres veces en Chiapas). Si solo hay una coincidencia, se agrega
sin preguntar, y las ciudades que ya guardaste se filtran de la lista.

### Pronóstico de 7 días

Las opciones 6 y 7 muestran el pronóstico diario de la ciudad default y de todas
las ciudades guardadas (en paralelo, como la opción 2). Cada fila trae el día, la
descripción del clima, el rango de temperatura en la unidad vigente, la
probabilidad de precipitación y el viento máximo. El primer día se marca `(hoy)`.

Las fechas se calculan con `timezone=auto`, así que el día es el de la ciudad, no
el del reloj de tu máquina.

### Colores

| Elemento | Color |
| --- | --- |
| Banner y menú | cyan |
| Separadores y "Hasta luego" | dim |
| Temperatura | yellow |
| Confirmaciones (ciudad agregada/eliminada, unidad) | green |
| Avisos (ya está en la lista, índice inválido) | yellow |
| Errores | red |

Los colores se desactivan solos cuando la salida no es una terminal (por ejemplo al
pipear a un archivo). `NO_COLOR` los desactiva siempre y `FORCE_COLOR` los fuerza.
