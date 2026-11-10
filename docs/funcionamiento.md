# Funcionamiento de la Web

La aplicación presenta un sidebar con módulos de Ventas y Compras. El módulo activo de Ventas muestra documentos registrados y la carga masiva.

## Documentos de ventas

Filtros: fechas, serie, número, centro de costo y tipos documentales. La grilla muestra importes, cliente, estado, referencia de NC/ND y observaciones.

La paginación permite navegar y elegir 25, 50 o 100 filas. Las columnas Cliente, Referencia NC/ND y Observaciones se expanden o contraen al pulsar su encabezado. Las observaciones contraídas se limitan a 20 caracteres.

## Carga masiva

El usuario carga un archivo `.xlsx` y completa tres etapas obligatorias en orden: validar archivo, cargar auxiliares y ejecutar carga masiva. Las etapas posteriores permanecen bloqueadas hasta que la anterior termine correctamente. Cada una informa su estado mediante bloqueo, check o error; si el archivo se elimina o reemplaza, el flujo vuelve a la primera etapa. La pantalla expone la hoja requerida `cargaMasiva` y las 19 columnas en el orden esperado.

Después de validar, se muestra una grilla con los documentos del archivo. Al completar la etapa de auxiliares, cada fila informa si fue insertada u omitida por duplicado y el motivo correspondiente.

## Autenticación

La interfaz está preparada para JWT. La activación final depende de configurar el proveedor de identidad en la API.
