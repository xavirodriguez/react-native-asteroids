/**
 * Utilidad para ejecutar métodos del ciclo de vida que pueden ser síncronos o asíncronos.
 *
 * @responsibility Ejecutar funciones de lifecycle minimizando latencias en el event loop.
 *
 * @remarks
 * Si la función es síncrona, se ejecuta inmediatamente y retorna. Si retorna una Promesa,
 * se espera a su resolución. Esto evita yields innecesarios al event loop para métodos
 * de ciclo de vida que no realizan IO.
 *
 * @param fn - La función de ciclo de vida a ejecutar.
 *
 * @invariant El método debe propagar cualquier error lanzado por `fn`.
 * @conceptualRisk [ZALGO] Aunque intenta mitigar yields, el hecho de ser `async` garantiza
 * que `runLifecycle` siempre retorne una Promesa, lo que introduce un microtask delay
 * incluso para funciones puramente síncronas.
 */
export async function runLifecycle(fn: () => void | Promise<void>): Promise<void> {
  const result = fn();
  if (result instanceof Promise) {
    await result;
  }
}
