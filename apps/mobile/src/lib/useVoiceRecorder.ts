import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";

export interface RecordedVoice {
  uri: string;
  /** "web" — Blob URI, нужно сначала fetch()-нуть; иначе — файловый uri для FormData. */
  platform: "web" | "native";
}

/** Запись голосовой заметки — единый API поверх expo-av, работает и в браузере, и в нативном приложении. */
export function useVoiceRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Нет доступа к микрофону");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать запись");
    }
  }, []);

  const stop = useCallback(async (): Promise<RecordedVoice | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Уже остановлена/выгружена — не критично, всё равно читаем uri ниже.
    }
    const uri = recording.getURI();
    recordingRef.current = null;
    setIsRecording(false);
    if (!uri) return null;
    return { uri, platform: uri.startsWith("blob:") || uri.startsWith("data:") ? "web" : "native" };
  }, []);

  return { isRecording, error, start, stop };
}
