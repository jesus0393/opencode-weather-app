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

## Inicializar proyecto

```bash
bun init
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
