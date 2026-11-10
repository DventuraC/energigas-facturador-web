# Configuración del dominio de la API

La Web Angular carga la URL base del backend al iniciar desde `public/config.json` (publicado como `/config.json`). No es necesario recompilar Angular para cambiarla: basta sustituir ese archivo en el servidor de hosting y recargar la aplicación.

Ejemplo local:

```json
{ "apiBaseUrl": "http://localhost:5000/api" }
```

Ejemplo QA:

```json
{ "apiBaseUrl": "https://api-qa.ejemplo.com/api" }
```

El valor debe incluir la ruta base `/api` y no terminar con `/`. Todos los consumidores (login, ventas, carga masiva e interceptor JWT) usan el mismo valor. Si la Web se sirve por HTTPS, la API también debe usar HTTPS.

## Despliegue y variables de entorno

El navegador no lee variables de entorno del servidor directamente. En Docker, IIS o pipelines CI/CD, genera o reemplaza el `config.json` publicado a partir de una variable de entorno `API_BASE_URL` durante el despliegue. No incluyas secretos en este archivo público. Asegura CORS en el backend para el origen de la Web y evita cachear `config.json` durante cambios de entorno.

Si falta el archivo o su URL es inválida, la aplicación detiene el arranque con un error de configuración en lugar de enviar solicitudes a un dominio incorrecto.
