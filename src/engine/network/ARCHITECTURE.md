# Arquitectura de Red y Sincronización

TinyAsterEngine está orientado a un modelo **autoritativo de servidor con predicción del lado del cliente y reconciliación (rollback)**.

## 📡 Pipeline de Comunicación

El flujo de sincronización busca mitigar la latencia y mantener la consistencia bajo condiciones de red controladas:

1.  **Captura de Input**: El cliente registra las acciones del jugador e intenta transmitirlas al servidor asociadas a un `tick` local.
2.  **Predicción Local**: El cliente aplica el input a su simulación local con el objetivo de proporcionar una respuesta visual inmediata.
3.  **Simulación Autoritativa**: El servidor actúa como la fuente de verdad, validando inputs y ejecutando la lógica oficial del juego.
4.  **Replicación Delta**: El servidor busca optimizar el ancho de banda enviando principalmente los cambios detectados (deltas) en el estado de los componentes.
5.  **Reconciliación (Rollback)**: En caso de discrepancia entre el estado predicho y el oficial, el cliente está diseñado para restaurar el estado del servidor y re-simular los ticks locales hasta el tiempo actual.

## 🗜️ Estrategias de Optimización

Para gestionar múltiples entidades, el motor incluye mecanismos destinados a reducir la carga de red:

### 1. Interest Management
Utiliza técnicas de particionamiento espacial (como `SpatialGrid`) para determinar la relevancia de las entidades para cada jugador. Esto busca limitar la transmisión de datos a lo que es potencialmente visible o interactuable.

### 2. Compresión Delta
En lugar de transmitir el estado completo del mundo, el sistema intenta utilizar el versionado de componentes (`stateVersion`) para enviar solo los datos que han mutado desde el último mensaje confirmado por el receptor.

### 3. Quantization
Los valores de punto flotante (posiciones, rotaciones) se cuantizan a enteros de precisión fija antes de la transmisión para reducir el tamaño de los datos.

### 4. Binary Serialization (MessagePack)
Utiliza `BinaryCompression` para empaquetar los objetos en un formato binario compacto, eliminando el overhead de las claves repetitivas de JSON.

## ⚠️ Riesgos Conceptuales

*   **[ROLLBACK_SYNC]**: Si el historial de estados en el cliente es demasiado corto, un lag excesivo impedirá la reconciliación correcta.
*   **[BINARY_COMPATIBILITY]**: Los cambios en los esquemas de componentes requieren una actualización sincronizada de cliente y servidor.
*   **[TICK_DRIFT]**: La deriva de reloj entre clientes puede causar que los inputs lleguen "al futuro" o "al pasado" lejano del servidor.
