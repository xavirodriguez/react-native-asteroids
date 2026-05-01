# Glosario Técnico de TinyAsterEngine

Este documento define los términos clave utilizados en el desarrollo y la arquitectura del motor.

---

### A
*   **ACK (Acknowledgment)**: Mensaje de confirmación que envía el cliente al servidor indicando que ha recibido y procesado una versión específica del estado.

### B
*   **Broad-phase (Fase Ancha)**: Primera etapa de la detección de colisiones que descarta rápidamente pares de objetos que están demasiado lejos para chocar, usando estructuras como el `SpatialGrid` o `Sweep and Prune`.

### C
*   **CCD (Continuous Collision Detection)**: Técnica para detectar colisiones en objetos que se mueven muy rápido y que podrían "saltar" a través de otros entre dos frames (ver *Tunnelling*).
*   **Componente (Component)**: Estructura de datos pura (POJO) que contiene el estado de una entidad en el sistema ECS.

### D
*   **Delta**: Representa la diferencia entre dos estados. En red, se refiere a enviar solo los componentes que han cambiado.
*   **Determinismo**: Propiedad de la simulación donde, dados los mismos inputs y semilla inicial, el resultado es idéntico en cualquier máquina.

### E
*   **ECS (Entity Component System)**: Patrón arquitectónico que separa los datos (Componentes) de la lógica (Sistemas), organizados mediante identificadores únicos (Entidades).
*   **Entidad (Entity)**: ID numérico que agrupa una colección de componentes.

### F
*   **Fixed Timestep**: Intervalo de tiempo constante (ej: 16.66ms) en el que se ejecuta la lógica de simulación, independientemente de los FPS de renderizado.

### I
*   **Interpolación**: Técnica visual para suavizar el movimiento de los objetos entre dos estados de simulación conocidos, usando un factor *alpha*.

### J
*   **Jitter**: Variación en el tiempo de llegada de los paquetes de red, que puede causar tirones visuales si no se gestiona con un buffer.

### M
*   **MTV (Minimum Translation Vector)**: El vector más pequeño necesario para separar dos objetos que están colisionando.

### N
*   **Narrow-phase (Fase Estrecha)**: Segunda etapa de la detección de colisiones que realiza cálculos exactos (ej: SAT) sobre los pares candidatos detectados en la Broad-phase.

### Q
*   **Quantization (Cuantización)**: Proceso de convertir valores de punto flotante de alta precisión en enteros más pequeños para reducir el ancho de banda.
*   **Query**: Consulta reactiva al `World` que devuelve todas las entidades que poseen una combinación específica de componentes.

### R
*   **Reconciliación (Reconciliation)**: Proceso por el cual el cliente corrige su estado local cuando recibe una actualización autoritativa del servidor que contradice su predicción.
*   **Rollback**: Acción de volver la simulación a un punto pasado en el tiempo para re-ejecutarla tras una corrección de estado.

### S
*   **SAT (Separating Axis Theorem)**: Algoritmo matemático para determinar si dos polígonos convexos colisionan.
*   **Snapshot**: Una captura completa del estado de todas las entidades y componentes en un tick determinado.

### T
*   **Tick**: Una unidad discreta de tiempo en la simulación (un frame lógico).
*   **TOI (Time of Impact)**: El momento exacto dentro de un frame [0, 1] en el que ocurre una colisión.
*   **Tunnelling (Efecto Túnel)**: Fallo en la detección de colisiones donde un objeto rápido atraviesa a otro sin que se detecte el contacto.
