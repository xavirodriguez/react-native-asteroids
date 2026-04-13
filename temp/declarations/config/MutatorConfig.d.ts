/**
 * Definitions and configurations for game mutators.
 */
export type GameId = 'asteroids' | 'flappybird' | 'pong' | 'spaceinvaders';
export interface Mutator {
    id: string;
    name: string;
    description: string;
    games: (GameId | 'all')[];
    apply: (config: any) => any;
}
export declare const MUTATORS: Mutator[];
