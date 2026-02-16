# Sincronización React-ECS - Documentación Técnica

## Descripción del Problema

La sincronización entre **React** (modelo declarativo) y **ECS** (modelo imperativo) presenta desafíos únicos:

- **React**: Re-renderiza basado en cambios de estado inmutables.
- **ECS**: Modifica entidades y componentes por referencia directa.
- **Desafío**: El World ECS cambia sin notificar a React de forma natural.

## Arquitectura de Sincronización en App.tsx

### Inicialización del Game Engine

```typescript
// app/index.tsx
useEffect(() => {
  const newGame = new AsteroidsGame();
  setGame(newGame);
  newGame.start();

  // Suscripción a actualizaciones del juego en lugar de polling
  const unsubscribe = newGame.subscribe((updatedGame) => {
    setGameState(updatedGame.getGameState());
    forceUpdate({}); // Fuerza el re-render para las entidades del juego
  });

  return () => {
    unsubscribe();
    newGame.stop();
  };
}, []);
```

**Patrón utilizado**: Mecanismo de suscripción basado en eventos (Observer Pattern).

### Sistema de Suscripción

En lugar de usar un `setInterval` de 16ms, el componente `App` se suscribe a los cambios del motor de juego.

#### Mecanismo de Suscripción en AsteroidsGame

```typescript
// src/game/AsteroidsGame.ts
subscribe(listener: UpdateListener): () => void {
  this.listeners.add(listener);
  return () => this.listeners.delete(listener);
}

private notifyListeners(): void {
  this.listeners.forEach(listener => listener(this));
}
```

#### Notificación en el Game Loop

```typescript
// src/game/AsteroidsGame.ts
private gameLoop = (): void => {
  if (!this.isRunning) return

  const currentTime = performance.now()
  const deltaTime = currentTime - this.lastTime
  this.lastTime = currentTime

  if (!this.isPaused) {
    this.world.update(deltaTime)
  }

  // Notifica a los suscriptores en cada frame para sincronizar la UI
  this.notifyListeners();

  this.gameLoopId = requestAnimationFrame(this.gameLoop)
}
```

### Mecanismo de Force Update

```typescript
const [, forceUpdate] = useState({});
// ...
forceUpdate({}); // Cambia la referencia del objeto para disparar el render
```

**Por qué es necesario**:

- El World ECS modifica los componentes **in-place** (mutación).
- React no detecta mutaciones profundas en los objetos del World.
- `GameRenderer` necesita re-ejecutar `world.query()` para visualizar los cambios de posición y estado.

### Flujo de Datos Bidireccional

#### React → ECS (Input)

```typescript
// app/index.tsx
const handleInput = (type, pressed) => {
  game.setInput(currentInputs.thrust, ...);
};
```

**Características**:

- **Latencia**: Prácticamente 0ms (llamada directa al sistema de input).
- **Threading**: Ejecución en el hilo principal (Main Thread).

#### ECS → React (State Update)

1. **ECS Systems** modifican los componentes (ej. `GameStateComponent`).
2. **Game Loop** invoca `notifyListeners()`.
3. **App Component** recibe la actualización y ejecuta `setGameState()` y `forceUpdate()`.
4. **UI Components** se re-renderizan con los datos frescos.

### Ventajas del Enfoque Actual

1. **Sincronización Perfecta**: La UI se actualiza exactamente cuando el motor termina su procesamiento de frame.
2. **Menor Latencia**: No hay desajuste (drift) entre el loop de lógica y el loop de renderizado de React.
3. **Eficiencia**: Se eliminan timers adicionales (`setInterval`), confiando únicamente en `requestAnimationFrame`.

### Limitaciones Identificadas

- **Re-renders Globales**: `forceUpdate({})` en el componente raíz provoca que todo el árbol de componentes se evalúe en cada frame.
- **Presión en el GC**: Se crea un nuevo objeto vacío `{}` 60 veces por segundo.

## Conclusiones

La arquitectura de sincronización actual mediante **suscripción** es una mejora significativa sobre el polling temporal, ofreciendo una experiencia de juego más fluida y una integración más limpia con el ciclo de vida de React.
