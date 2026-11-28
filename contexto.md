**Contexto del Proyecto: MusicShare (Banco de Instrumentos Serverless)**

Estoy desarrollando **MusicShare**, una plataforma web serverless que conecta a músicos y estudiantes que necesitan instrumentos con propietarios o academias que pueden prestarlos, centralizando y automatizando la gestión de préstamos.

### 1. Stack Tecnológico y Entorno Local

* **Emulador AWS Local:** Floci corriendo en Docker (`http://localhost:4566`), gratuito y compatible con las APIs de AWS (sin cuenta real ni credenciales en la nube).


* **Infraestructura como Código (IaC):** Terraform configurado con el *provider* de AWS apuntando a los endpoints locales de Floci.
* **Backend (Cómputo):** AWS Lambda en Python 3.12 usando `boto3` (apuntando a `localhost:4566`) y `Pydantic` para validación.


* **Frontend:** SPA web responsive y liviana en React, conectada directamente al API Gateway.


* **Servicios AWS utilizados:** API Gateway (REST), Lambda, DynamoDB, S3, SQS, EventBridge y SNS.



### 2. Alcance del MVP

* **Incluido:**
* **Usuarios:** CRUD básico para gestionar participantes y correos de notificación.


* **Instrumentos:** CRUD del catálogo con almacenamiento de fotografías en Amazon S3.


* **Préstamos:** Registro de solicitudes, asignación y cambio de estado (`activo`, `devuelto`, `dañado`).


* **Seguimiento automático (Diferenciador):** Alertas programadas de vencimiento y flujo automático de mantenimiento por daños.




* **Excluido (Simplificaciones del MVP):**
* Sin CRUD independiente de categorías (se maneja como un atributo dentro de la tabla de instrumentos en DynamoDB).


* Sin autenticación compleja (se usan *headers* simulados en las peticiones HTTP).


* Sin aplicación móvil nativa.





### 3. Arquitectura y Comunicación entre Servicios

* **Tablas en DynamoDB:** `Usuarios`, `Instrumentos` y `Préstamos`.


* **Buckets en S3:** Almacenamiento de imágenes de instrumentos (`ImgInstrumentos`) y archivos estáticos del frontend (`Front React`).


* **Flujo Síncrono (CRUD):** Un único **API Gateway** recibe las peticiones del frontend y enruta a Lambdas independientes por operación (`crear`, `buscar`, `actualizar`, `eliminar`), las cuales leen y escriben directamente en DynamoDB y S3 usando Boto3 (sin SQS ni EventBridge en medio).


* **Flujo Asíncrono 1 — Reporte de Daños (Por evento):** Cuando un préstamo se actualiza a estado `dañado`, la Lambda de préstamos envía un mensaje a una cola **Amazon SQS**. Esta dispara automáticamente una Lambda de mantenimiento que actualiza el estado del instrumento en DynamoDB y notifica al propietario/administrador mediante **Amazon SNS**.


* **Flujo Asíncrono 2 — Revisión de Vencimientos (Programado):** **Amazon EventBridge** ejecuta un cron diario (sin pasar por API Gateway) que dispara una Lambda (`revisarVencimientos`). Esta consulta los préstamos activos en DynamoDB y, si alguno está próximo a vencer o vencido, envía una alerta al usuario mediante **Amazon SNS**.



### 4. Reglas de Diseño para tus Respuestas

* Evita proponer llamadas síncronas entre Lambdas (cada Lambda accede directamente a las tablas de DynamoDB que necesite).
* Todo el código de Terraform y Python (`boto3`) debe estar adaptado para ejecutarse localmente contra Floci en `http://localhost:4566`.
