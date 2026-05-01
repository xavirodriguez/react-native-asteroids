# Arquitectura de Red y Sincronización

TinyAsterEngine utiliza un modelo **autoritativo de servidor con predicción del lado del cliente y reconciliación (rollback)**.

## 📡 Pipeline de Comunicación

1.  **Captura de Input**: El cliente captura las acciones del jugador y las envía al servidor etiquetadas con un `tick` local.
2.  **Predicción Local**: El cliente aplica ese input inmediatamente a su simulación local para eliminar la sensación de latencia.
3.  **Simulación Autoritativa**: El servidor recibe los inputs, los valida y ejecuta la simulación oficial en el mismo `tick`.
4.  **Replicación Delta**: El servidor envía a los clientes solo los cambios ocurridos (deltas) mediante `NetworkDeltaSystem`.
5.  **Reconciliación (Rollback)**: Si el estado del servidor para un `tick` dado difiere de la predicción que hizo el cliente, el cliente "vuelve atrás" en el tiempo, restaura el estado oficial y vuelve a simular todos los ticks hasta el presente.

## 🗜️ Optimización de Ancho de Banda

Para escalar a cientos de entidades, el motor implementa varias capas de optimización:

### 1. Interest Management (USSC)
Utiliza el `SpatialGrid` para calcular qué entidades son visibles o relevantes para cada jugador. Los datos de entidades fuera del área de interés se envían con menor frecuencia o se omiten.

### 2. Delta Compression
En lugar de enviar un snapshot completo del mundo (`WorldSnapshot`), el sistema rastrea la versión de cada componente (`stateVersion`). Solo se transmiten los componentes que han mutado desde el último ACK confirmado por el cliente.

### 3. Quantization
Los valores de punto flotante (posiciones, rotaciones) se cuantizan a enteros de precisión fija antes de la transmisión para reducir el tamaño de los datos.

### 4. Binary Serialization (MessagePack)
Utiliza `BinaryCompression` para empaquetar los objetos en un formato binario compacto, eliminando el overhead de las claves repetitivas de JSON.

## ⚠️ Riesgos Conceptuales

*   **[ROLLBACK_SYNC]**: Si el historial de estados en el cliente es demasiado corto, un lag excesivo impedirá la reconciliación correcta.
*   **[BINARY_COMPATIBILITY]**: Los cambios en los esquemas de componentes requieren una actualización sincronizada de cliente y servidor.
*   **[TICK_DRIFT]**: La deriva de reloj entre clientes puede causar que los inputs lleguen "al futuro" o "al pasado" lejano del servidor.
