import { AudioSystem } from "../AudioSystem";

describe("AudioSystem", () => {
  let audio: AudioSystem;

  beforeEach(() => {
    // Mock AudioContext and related objects
    (window as any).AudioContext = jest.fn().mockImplementation(() => ({
      createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        loop: false,
        start: jest.fn(),
        stop: jest.fn(),
        connect: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: { value: 1.0 },
        connect: jest.fn(),
      }),
      decodeAudioBuffer: jest.fn().mockResolvedValue({}),
      resume: jest.fn().mockResolvedValue(undefined),
      destination: {},
    }));

    audio = new AudioSystem();
  });

  it("should initialize with master volume 1.0", () => {
    expect((audio as any).masterVolume).toBe(1.0);
  });

  it("should update master volume within bounds", () => {
    audio.setMasterVolume(0.5);
    expect((audio as any).masterVolume).toBe(0.5);

    audio.setMasterVolume(1.5);
    expect((audio as any).masterVolume).toBe(1.0);

    audio.setMasterVolume(-0.5);
    expect((audio as any).masterVolume).toBe(0);
  });

  it("should call resume on the context", () => {
    const ctx = (audio as any).ctx;
    audio.resume();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("should stop music when stopMusic is called", () => {
    const mockSource = { stop: jest.fn() };
    (audio as any).currentMusicSource = mockSource;

    audio.stopMusic();

    expect(mockSource.stop).toHaveBeenCalled();
    expect((audio as any).currentMusicSource).toBeNull();
  });
});
