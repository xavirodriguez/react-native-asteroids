/**
 * Configuration for multiplayer exposure states.
 */

export type MultiplayerState = 'hidden' | 'beta' | 'available';

function get_DEV() {
    try {
        return (__DEV__ as boolean);
    } catch {
        return process.env.NODE_ENV !== 'production';
    }
}

const IS_DEV = get_DEV();

/**
 * The current state of multiplayer features.
 * - 'hidden': No multiplayer UI is shown.
 * - 'beta': Multiplayer is shown with a "BETA" tag, enabled only in DEV or via flag.
 * - 'available': Multiplayer is fully available.
 */
export const MULTIPLAYER_CONFIG = {
  STATE: (process.env.EXPO_PUBLIC_MULTIPLAYER_STATE as MultiplayerState) || (IS_DEV ? 'beta' : 'hidden'),
};
