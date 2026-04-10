import { World } from "../engine/core/World";

export const BENEFICIAL_MUTATORS = {
  "faster_bullets": {
    id: "faster_bullets",
    description: "Balas 10% más rápidas en todos los juegos",
    xpCost: 500,
    apply: (world: World) => {
      // implementation would depend on game config modification or systemic override
    }
  },
  "extra_life": {
    id: "extra_life",
    description: "Empezar con 1 vida extra",
    xpCost: 800,
    apply: (world: World) => {
      // increase player health
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: (world: World) => {
      // set multiplier in gamestate
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: (world: World) => {
      // set invulnerability frames
    }
  },
};
