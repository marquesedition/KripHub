# KripHub - funcionamiento funcional y tecnico

## Vision

KripHub es una galeria privada de imagenes y videos organizada por carpetas. Al registrarse o iniciar sesion, una cuenta puede no ver ningun contenido. El contenido aparece solo cuando el usuario desbloquea una carpeta mediante un codigo valido o cuando el propio usuario crea contenido como propietario.

Una misma cuenta puede actuar como propietario y como receptor. No hay una separacion rigida entre "admin" y "usuario": cada perfil puede tener su propia galeria, crear carpetas, subir contenido cifrado y compartir carpetas con otras personas mediante codigos de acceso.

## Principios de producto

- La galeria inicial puede estar vacia.
- El contenido esta agrupado en carpetas o colecciones.
- Cada carpeta pertenece a un perfil propietario.
- El receptor nunca ve carpetas de otros perfiles hasta introducir un codigo valido.
- Un codigo desbloquea una carpeta concreta, no toda la cuenta del propietario.
- El acceso puede ser temporal o definitivo.
- El propietario puede revocar cualquier acceso en cualquier momento.
- El receptor no puede generar ni compartir permisos sobre contenido ajeno.
- El acceso se comprueba cada vez que se abre una carpeta, antes de listar o descargar contenido.
- Si el acceso expira o se revoca, la carpeta deja de estar disponible.

## Roles

### Propietario

El propietario es cualquier usuario que crea carpetas y sube contenido. Puede:

- Crear carpetas o colecciones.
- Subir imagenes y videos.
- Cifrar el contenido en el dispositivo antes de subirlo.
- Generar codigos vinculados a una carpeta.
- Elegir acceso temporal o definitivo.
- Definir duracion para accesos temporales.
- Ver accesos activos, expirados y revocados.
- Revocar codigos o accesos concedidos.
- Decidir que carpetas son compartibles.

### Receptor

El receptor es cualquier usuario que introduce un codigo recibido. Puede:

- Registrarse o iniciar sesion con nickname y contrasena.
- Ver su galeria vacia o sus carpetas desbloqueadas.
- Introducir codigos de acceso.
- Abrir carpetas desbloqueadas.
- Ver imagenes y videos mientras el acceso siga vigente.
- Consultar sus accesos activos, expirados o revocados.

El receptor no puede ver claves, permisos internos ni generar codigos sobre carpetas que no posee.

## Tipos de acceso

### Temporal

Un acceso temporal tiene:

- Fecha de inicio.
- Fecha de expiracion.
- Estado `active`, `expired` o `revoked`.
- Duracion predefinida o personalizada.

Duraciones previstas:

- 1 hora.
- 24 horas.
- 7 dias.
- 30 dias.
- Personalizada.

Al expirar, la carpeta queda bloqueada y la app elimina claves locales relacionadas cuando sea posible.

### Definitivo

Un acceso definitivo:

- No tiene fecha de expiracion.
- Permanece activo hasta revocacion manual.
- Debe seguir dependiendo de una autorizacion del servidor para futuras descargas.

Aunque sea definitivo, el propietario conserva el control: puede revocarlo.

### Revocado

Un acceso revocado:

- Se cancela manualmente por el propietario.
- Deja de autorizar lectura de metadatos, descarga de archivos y lectura de claves envueltas.
- Debe desaparecer de la galeria del receptor o mostrarse como bloqueado.

## Flujo del receptor

1. El usuario abre KripHub.
2. Inicia sesion con nickname y contrasena.
3. Ve su galeria, que puede estar vacia.
4. Abre la pantalla "Introducir codigo".
5. Introduce el codigo recibido.
6. La app envia el codigo a una Edge Function autenticada.
7. La Edge Function normaliza y hashea el codigo.
8. El servidor valida que el codigo existe, esta activo, pertenece a una carpeta compartida, no esta expirado y no esta revocado.
9. Si el codigo es valido, se crea un acceso para el receptor.
10. La carpeta aparece en la galeria del receptor.
11. Al abrir la carpeta, la app vuelve a comprobar que el acceso sigue activo.
12. Si el acceso ya no es valido, la carpeta se bloquea o desaparece.

## Flujo del propietario

1. El propietario inicia sesion.
2. Crea una carpeta o coleccion.
3. Sube imagenes y videos.
4. La app genera una clave por archivo.
5. La app cifra cada archivo en el dispositivo antes de subirlo.
6. Supabase Storage guarda solo archivos cifrados en un bucket privado.
7. El propietario abre "Generar codigo".
8. Selecciona una carpeta.
9. Elige tipo de acceso: temporal o definitivo.
10. Si es temporal, define la duracion.
11. La app genera un codigo de alta entropia.
12. El servidor guarda solo el hash del codigo.
13. El sistema crea las claves envueltas necesarias para que ese codigo permita descifrar solo esa carpeta.
14. El propietario comparte el codigo fuera de la app.
15. Desde "Gestionar accesos", puede ver estados y revocar permisos.

## Pantallas

- Login.
- Registro con nickname y contrasena.
- Galeria principal.
- Carpeta o coleccion.
- Visor de imagen.
- Reproductor de video.
- Introducir codigo.
- Mis accesos.
- Crear carpeta.
- Subir contenido.
- Generar codigo.
- Gestionar accesos.

## Modelo de datos propuesto

### `profiles`

Perfil de cada cuenta.

Campos clave:

- `id`: UUID vinculado a `auth.users`.
- `nickname`: unico.
- `created_at`.
- `updated_at`.

No hace falta un rol global para el funcionamiento normal. Un perfil es propietario de las carpetas que crea y receptor de las carpetas que desbloquea.

### `collections`

Carpetas de contenido.

Campos clave:

- `id`.
- `owner_id`.
- `title`.
- `description`.
- `created_at`.
- `updated_at`.

RLS:

- El propietario puede crear, leer, actualizar y eliminar sus carpetas.
- El receptor solo puede leer carpetas con acceso activo.

### `media`

Archivos cifrados pertenecientes a una carpeta.

Campos clave:

- `id`.
- `collection_id`.
- `owner_id`.
- `type`: `image` o `video`.
- `title`.
- `encrypted_storage_path`.
- `thumbnail_encrypted_storage_path`.
- `encryption_version`.
- `nonce`.
- `auth_tag`.
- `size_bytes`.
- `created_at`.

RLS:

- El propietario puede gestionar media de sus carpetas.
- El receptor solo puede leer metadatos de media perteneciente a carpetas con acceso activo.

### `access_codes`

Codigos generados por propietarios.

Campos clave:

- `id`.
- `owner_id`.
- `collection_id`.
- `code_hash`.
- `access_type`: `temporary` o `permanent`.
- `starts_at`.
- `expires_at`: obligatorio para temporal, nulo para definitivo.
- `max_uses`.
- `used_count`.
- `status`: `active`, `used`, `expired`, `revoked`.
- `created_at`.
- `revoked_at`.

RLS:

- El propietario puede listar y revocar sus propios codigos.
- El receptor no puede leer codigos directamente.
- La validacion del codigo se hace mediante Edge Function.

### `access_sessions`

Accesos concedidos a receptores despues de validar un codigo.

Campos clave:

- `id`.
- `collection_id`.
- `owner_id`.
- `recipient_id`.
- `access_code_id`.
- `access_type`.
- `starts_at`.
- `expires_at`.
- `revoked_at`.
- `created_at`.

RLS:

- El propietario puede ver y revocar accesos sobre sus carpetas.
- El receptor puede ver sus propios accesos.
- La lectura de carpetas y media debe depender de esta tabla.

### `media_keys`

Claves de archivo envueltas para un acceso autorizado.

Campos clave:

- `id`.
- `media_id`.
- `access_code_id`.
- `recipient_id`.
- `encrypted_media_key`.
- `key_encryption_version`.
- `created_at`.
- `revoked_at`.

RLS:

- El receptor solo puede leer grants de accesos propios activos.
- El propietario puede listar grants de sus carpetas si hace falta para gestion.
- La clave de archivo nunca se guarda en claro.

### `code_attempts`

Intentos de validacion para rate limiting y auditoria minima.

Campos clave:

- `id`.
- `user_id`.
- `code_hash`.
- `success`.
- `created_at`.

Los logs deben ser minimos. No se guarda el codigo en claro.

### `audit_events`

Eventos de seguridad y gestion.

Eventos utiles:

- `access_code_created`.
- `access_code_accepted`.
- `access_code_rejected`.
- `access_code_revoked`.
- `collection_access_revoked`.
- `media_uploaded`.

No debe guardar nombres de archivo sensibles, codigos en claro ni claves.

## Cifrado

### Cifrado de archivo

- Cada archivo tiene una clave aleatoria propia.
- El archivo se cifra localmente antes de subirlo.
- Algoritmo recomendado: AES-256-GCM.
- Cada cifrado usa nonce unico.
- Storage recibe solo ciphertext.
- Los metadatos guardan nonce, auth tag, version de cifrado y ruta cifrada.

### Claves

- La clave de archivo no se guarda en claro en Supabase.
- Para compartir, la clave de archivo se envuelve con una clave derivada del codigo o con una clave de acceso del receptor.
- Cada permiso debe permitir descifrar solo los archivos autorizados.
- Para accesos definitivos, conviene que el grant quede vinculado al receptor y pueda revocarse en servidor.

### Limitacion importante

Si un receptor ya descargo un archivo y obtuvo su clave localmente, no se puede garantizar borrado criptografico retroactivo en su dispositivo. La revocacion si debe impedir:

- Nuevas lecturas de metadatos.
- Nuevas descargas desde Storage.
- Nuevas lecturas de claves envueltas.
- Acceso a nuevos archivos agregados a la carpeta.

## Supabase

### Storage

- Bucket privado: `encrypted-media`.
- No usar buckets publicos.
- Solo aceptar archivos `.enc`.
- Usar `application/octet-stream`.
- La ruta debe incluir el propietario y la carpeta, por ejemplo:
  `owners/{owner_id}/collections/{collection_id}/media/{media_id}.enc`

Politicas:

- El propietario puede subir, actualizar y eliminar objetos dentro de sus rutas.
- El receptor solo puede descargar objetos cuando exista un acceso activo a la carpeta.
- La service role key nunca se usa en Expo.

### RLS

RLS debe estar activado en todas las tablas expuestas.

Reglas base:

- `profiles`: cada usuario lee su perfil.
- `collections`: propietario gestiona; receptor lee si tiene acceso activo.
- `media`: propietario gestiona; receptor lee si la carpeta esta autorizada.
- `access_codes`: propietario gestiona sus codigos; receptor no lee.
- `access_sessions`: propietario gestiona accesos de sus carpetas; receptor lee sus accesos.
- `media_keys`: receptor lee solo claves envueltas autorizadas por sesiones activas.
- `audit_events`: lectura restringida al propietario afectado o a mantenimiento interno.

### Edge Functions

Funciones necesarias:

- `validate-access-code`: valida codigo, crea acceso y devuelve grants necesarios.
- `revoke-access`: revoca un acceso concedido.
- `create-access-code`: recomendable si se quiere centralizar la generacion y evitar escribir codigos desde cliente.

`validate-access-code` debe:

- Requerir usuario autenticado.
- Normalizar el codigo.
- Hashear el codigo.
- Aplicar rate limiting por usuario.
- Rechazar codigos inexistentes, expirados, usados o revocados.
- Crear `access_sessions`.
- Incrementar `used_count` de forma atomica.
- Devolver solo lo necesario para que la app desbloquee la carpeta.

## Reglas de validacion

- Un codigo temporal sin `expires_at` es invalido.
- Un codigo definitivo debe tener `expires_at = null`.
- Un codigo revocado nunca valida.
- Un codigo expirado debe pasar a estado `expired`.
- Si `max_uses` se alcanza, el codigo pasa a `used`.
- Un receptor no debe poder canjear un codigo creado por el mismo propietario si el producto decide bloquear autoconsumo. Por defecto, se permite para pruebas.
- Un acceso revocado debe bloquear carpeta, media, Storage y grants.

## Estado actual del repo

El esqueleto actual ya incluye:

- Expo Router con rutas protegidas `auth`, `main` y `owner`.
- NativeWind configurado como sistema de diseño.
- Pantallas de login, registro, galeria, introducir codigo, carpeta, visor, reproductor, perfil, accesos, crear carpeta, subir contenido, generar codigo y gestionar accesos.
- Supabase Auth con nickname mediante alias de email.
- Cifrado cliente con AES-GCM.
- Bucket privado `encrypted-media`.
- RLS inicial.
- Edge Function `validate-access-code`.
- Codigos temporales y definitivos guardados como hash.
- Galeria basada en carpetas propias y compartidas.
- Revocacion de codigos y accesos concedidos.

Puntos pendientes para una version de produccion:

- Pasar el cifrado/descifrado de videos grandes a modo chunked/streaming.
- Definir recuperacion de claves del propietario entre dispositivos.
- Generar grants para archivos nuevos cuando una carpeta ya tiene accesos activos, si el producto decide que esos accesos incluyan contenido futuro.
- Anadir pruebas automatizadas de RLS y flujos de revocacion.
- Mejorar previsualizaciones cifradas y miniaturas.

## Proxima implementacion recomendada

1. Probar la migracion en una base Supabase limpia.
2. Desplegar `validate-access-code`.
3. Validar RLS con usuarios propietario/receptor reales.
4. Probar subida cifrada, desbloqueo por codigo, expiracion y revocacion.
5. Preparar cifrado chunked para videos grandes.
