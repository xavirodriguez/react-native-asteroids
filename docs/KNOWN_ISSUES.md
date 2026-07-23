# Known Issues — react-native-asteroids

## BUG-001: AsteroidComboSystem acumula listeners en restart
Estado: abierto
Archivo: src/games/asteroids/systems/AsteroidComboSystem.ts
Descripción: El mismo patrón de acumulación de handlers corregido en LootSystem (PR #297)
existe de forma pre-existente en AsteroidComboSystem. No se fijó en ese PR.
Causa probable: registerListeners() no guarda referencias para cleanup.
