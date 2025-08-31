// src/input/InputController.ts
export interface GameInputs {
    thrust: boolean;
    rotateLeft: boolean;
    rotateRight: boolean;
    shoot: boolean;
  }
  
  export abstract class InputController {
    protected inputs: GameInputs = {
      thrust: false,
      rotateLeft: false,
      rotateRight: false,
      shoot: false,
    };
  
    abstract setup(): void;
    abstract cleanup(): void;
    
    getCurrentInputs(): Readonly<GameInputs> {
      return { ...this.inputs };
    }
  }
  
  // Keyboard implementation
  export class KeyboardController extends InputController {
    private keys = new Set<string>();
    
    setup(): void {
      if (typeof window === "undefined") return;
      
      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
    }
    
    cleanup(): void {
      if (typeof window === "undefined") return;
      
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
    }
    
    private handleKeyDown = (e: KeyboardEvent): void => {
      this.keys.add(e.code);
      this.updateInputs();
    };
    
    private handleKeyUp = (e: KeyboardEvent): void => {
      this.keys.delete(e.code);
      this.updateInputs();
    };
    
    private updateInputs(): void {
      this.inputs = {
        thrust: this.keys.has("ArrowUp"),
        rotateLeft: this.keys.has("ArrowLeft"),
        rotateRight: this.keys.has("ArrowRight"),
        shoot: this.keys.has("Space"),
      };
    }
  }
  
  // Touch implementation
  export class TouchController extends InputController {
    setup(): void {
      // No DOM setup needed for touch
    }
    
    cleanup(): void {
      // No cleanup needed
    }
    
    setInputs(inputs: Partial<GameInputs>): void {
      this.inputs = { ...this.inputs, ...inputs };
    }
  }