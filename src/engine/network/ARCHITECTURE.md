# Arquitectura de Red y Sincronización

TinyAsterEngine está diseñado en torno a un modelo **autoritativo de servidor con predicción del lado del cliente y reconciliación (rollback)**.

## 📡 Pipeline de Comunicación (Diseño)

1.  **Captura de Input**: El cliente captura las acciones del jugador e intenta enviarlas al servidor etiquetadas con un `tick` local.
2.  **Predicción Local**: El cliente aplica ese input a su simulación local buscando reducir la sensación de latencia.
3.  **Simulación Autoritativa**: El servidor recibe los inputs, busca validarlos y ejecuta la simulación oficial.
4.  **Replicación Delta**: El servidor intenta enviar a los clientes solo los cambios detectados (deltas) para optimizar el ancho de banda.
5.  **Reconciliación (Rollback)**: Si el estado del servidor para un `tick` dado difiere de la predicción del cliente, el sistema está diseñado para que el cliente restaure el estado oficial e intente re-simular los ticks hasta el presente.

## 🗜️ Optimización de Ancho de Banda

Para escalar a cientos de entidades, el motor implementa varias capas de optimización:

### 1. Interest Management (USSC)
Utiliza el `SpatialGrid` para calcular qué entidades son visibles o relevantes para cada jugador. Los datos de entidades fuera del área de interés se envían con menor frecuencia o se omiten.

### 2. Delta Compression
En lugar de enviar un snapshot completo del mundo (`WorldSnapshot`), el sistema busca rastrear la versión de cada componente (`stateVersion`). La intención es transmitir principalmente los componentes que han mutado desde el último ACK confirmado por el cliente.

### 3. Quantization
Los valores de punto flotante (posiciones, rotaciones) se cuantizan a enteros de precisión fija antes de la transmisión para reducir el tamaño de los datos.

### 4. Binary Serialization (MessagePack)
Utiliza `BinaryCompression` para empaquetar los objetos en un formato binario compacto, eliminando el overhead de las claves repetitivas de JSON.

## ⚠️ Riesgos Conceptuales

*   **[ROLLBACK_SYNC]**: Si el historial de estados en el cliente es demasiado corto, un lag excesivo impedirá la reconciliación correcta.
*   **[BINARY_COMPATIBILITY]**: Los cambios en los esquemas de componentes requieren una actualización sincronizada de cliente y servidor.
*   **[TICK_DRIFT]**: La deriva de reloj entre clientes puede causar que los inputs lleguen "al futuro" o "al pasado" lejano del servidor.
