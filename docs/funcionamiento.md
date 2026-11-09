# Funcionamiento de la Web

La aplicación presenta un sidebar con módulos de Ventas y Compras. El módulo activo de Ventas muestra documentos registrados y la carga masiva.

## Documentos de ventas

Filtros: fechas, serie, número, centro de costo y tipos documentales. La grilla muestra importes, cliente, estado, referencia de NC/ND y observaciones.

La paginación permite navegar y elegir 25, 50 o 100 filas. Las columnas Cliente, Referencia NC/ND y Observaciones se expanden o contraen al pulsar su encabezado. Las observaciones contraídas se limitan a 20 caracteres.

## Carga masiva

El usuario selecciona el Excel, lo valida, carga los auxiliares y ejecuta el procedimiento mediante la API.

## Autenticación

La interfaz está preparada para JWT. La activación final depende de configurar el proveedor de identidad en la API.
