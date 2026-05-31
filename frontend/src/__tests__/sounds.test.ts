import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AudioContext since jsdom doesn't have Web Audio API
const mockOscillator = {
  type: "sine",
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn().mockReturnThis(),
};

const mockAudioContext = {
  state: "running",
  currentTime: 0,
  sampleRate: 44100,
  resume: vi.fn(),
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(2646)),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: "bandpass",
    frequency: { setValueAtTime: vi.fn() },
    Q: { setValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
  })),
  destination: {},
};

vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
vi.stubGlobal("localStorage", localStorageMock);

// Mock matchMedia
vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

describe("useSounds hook contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("module exports useSounds function", async () => {
    const mod = await import("@/lib/sounds");
    expect(mod.useSounds).toBeDefined();
    expect(typeof mod.useSounds).toBe("function");
  });

  it("useSounds returns expected shape", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result: hookResult } = renderHook(() => useSounds());

    expect(hookResult.current).toHaveProperty("playClick");
    expect(hookResult.current).toHaveProperty("playSuccess");
    expect(hookResult.current).toHaveProperty("playError");
    expect(hookResult.current).toHaveProperty("playTransition");
    expect(hookResult.current).toHaveProperty("playNotification");
    expect(hookResult.current).toHaveProperty("enabled");
    expect(hookResult.current).toHaveProperty("toggle");
  });

  it("enabled defaults to true", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result } = renderHook(() => useSounds());
    expect(result.current.enabled).toBe(true);
  });

  it("toggle switches enabled state", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result } = renderHook(() => useSounds());

    act(() => { result.current.toggle(); });
    expect(result.current.enabled).toBe(false);

    act(() => { result.current.toggle(); });
    expect(result.current.enabled).toBe(true);
  });

  it("toggle persists to localStorage", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result } = renderHook(() => useSounds());

    act(() => { result.current.toggle(); });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nightmarenet-sound-enabled",
      "false"
    );
  });

  it("play functions are callable without error", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result } = renderHook(() => useSounds());

    expect(() => result.current.playClick()).not.toThrow();
    expect(() => result.current.playSuccess()).not.toThrow();
    expect(() => result.current.playError()).not.toThrow();
    expect(() => result.current.playTransition()).not.toThrow();
    expect(() => result.current.playNotification()).not.toThrow();
  });

  it("all play functions are type function", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useSounds } = await import("@/lib/sounds");
    const { result } = renderHook(() => useSounds());

    expect(typeof result.current.playClick).toBe("function");
    expect(typeof result.current.playSuccess).toBe("function");
    expect(typeof result.current.playError).toBe("function");
    expect(typeof result.current.playTransition).toBe("function");
    expect(typeof result.current.playNotification).toBe("function");
  });
});
