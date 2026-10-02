# Diseño del prototipo

## Concepto

**Milagros prestados** es una aventura breve de asombro y misterio. El jugador es un peregrino que entra en un santuario donde nada nuevo parece crecer. Su don permite trasladar el crecimiento entre dos plantas: la receptora crece en la medida en que la donante cede. La vida no se crea y cada intercambio se puede invertir, sin pérdidas permanentes.

La aventura busca durar entre 10 y 15 minutos como objetivo de diseño; todavía no está medida. No hay combate ni diálogos extensos. El santuario cuenta su historia con raíces, luz, acordes tenues y arquitectura de piedra azul petróleo, vegetación salvia y filamentos de oro.

## Recorrido

El espacio es un único santuario continuo con tres zonas:

1. **Umbral:** el jugador presta crecimiento de un arbusto exuberante a una raíz que completa el paso sobre una grieta.
2. **Patio:** dos rutas compiten por el crecimiento disponible. El presupuesto no alcanza para abrir ambas a la vez; invertir un intercambio permite probar la otra.
3. **Corazón:** una enredadera obstruye la puerta. Tras redistribuir su crecimiento, un brote revela la presencia de un árbol enterrado y conduce al cierre.

El misterio es visual y progresivo: el jardín parece crecer hacia el interior del santuario y bajo sus piedras, como si alimentara algo enterrado. El cierre recontextualiza el jardín como guía del crecimiento hacia el árbol subterráneo. No se atribuyen al jugador sentimientos o decisiones morales permanentes.

## Regla y recuperación

El sistema de crecimiento es independiente de Three.js. Conserva un total de 12 unidades, limita cada planta a su capacidad y registra un único paso de deshacer por gesto de transferencia. Las plantas cambian gradualmente entre formas procedurales prediseñadas. Cada extremo y la distancia entre ambos deben estar dentro de un alcance de 7 unidades; esto mantiene el presupuesto propio de cada recinto.

El patio dispone de 5 unidades. Completar su puente necesita 2,8 y la rampa 3,8, de modo que ambos caminos no pueden estar completos a la vez. La terraza tiene una bajada permanente al corazón. Si una superficie viva se retira debajo del peregrino, el juego lo devuelve a suelo firme. Deshacer recupera la distribución anterior y una posición segura; reiniciar restaura todo el santuario.

## Controles

- **W A S D** o **flechas**: movimiento.
- **Clic en una planta donante y luego en una receptora**: elegir extremos del traslado.
- **Mantener E**: transferir crecimiento mientras se mantiene el gesto.
- **X**: invertir donante y receptora.
- **Escape**: limpiar la selección.
- **Z**: deshacer el intercambio, con retorno a una posición segura.
- **R**: reiniciar todo el santuario.
- **Botón de sonido**: silenciar o restaurar el audio.

No hay salto.

## Dirección de audio

`src/game/audio.ts` sintetiza sonido con Web Audio, sin archivos de audio ni dependencias. `unlock()` se llama únicamente al pulsar «Entrar», para respetar la política de audio del navegador. El fondo es un tono ambiental suave; mantener E añade un hilo ascendente; los avances producen un acorde breve y la revelación final un acorde más amplio. El volumen maestro es moderado y el control de silencio afecta a toda la mezcla. Si Web Audio no está disponible, los métodos son seguros y el juego continúa sin sonido.

## Producción y decisiones

El proyecto usa Bun, Three.js, TypeScript y Vite. El prototipo limita su alcance a una escena continua, una regla mágica, tres momentos de transferencia y un cierre ambiental. La implementación prioriza geometría y sonido procedurales para que sea viable sin paquetes de recursos externos.

El concepto surgió de un workflow creativo con tres agentes Luna y Sol como coordinador. Luna exploró y refinó las propuestas narrativas y visuales; Sol coordinó la convergencia y contrastó el alcance con el prototipo técnico. La propuesta seleccionada fue «Milagros prestados».

## Pendiente de validación

Hace falta un playtest humano para comprobar que los jugadores entienden donante/receptora e inversión sin explicación larga, descubren el presupuesto compartido del patio y leen el árbol enterrado en el cierre. El objetivo de duración de 10–15 minutos también debe medirse con jugadores.
