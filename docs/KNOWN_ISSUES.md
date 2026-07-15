# Known Issues — react-native-asteroids

## BUG-001: AsteroidComboSystem acumula listeners en restart
Estado: cerrado
Archivo: packages/core/src/runtime/BaseGame.ts
Descripción: Evita la acumulación de event listeners de cualquier sistema (incluido un potencial Combo o Loot system) al reiniciar el juego.
Solución: Se implementó un ciclo de vida limpio y seguro del `EventBus` llamando explícitamente a `this.eventBus.clear()` en el método `restart()` de la clase `BaseGame` antes de volver a registrar recursos y sistemas en el `World`. Esto elimina de raíz la acumulación de suscripciones y de eventos diferidos en cada reinicio.
