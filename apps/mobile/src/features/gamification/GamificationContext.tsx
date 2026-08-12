import type { CharacterDto, CreateEpicWinInput, EpicWinDetailDto, EpicWinSummaryDto } from "@mypetproj/shared";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../lib/useApi";

interface GamificationContextValue {
  character: CharacterDto | null;
  epicWins: EpicWinSummaryDto[];
  loading: boolean;
  refreshCharacter: () => Promise<void>;
  refreshEpicWins: () => Promise<void>;
  createEpicWin: (input: CreateEpicWinInput) => Promise<EpicWinDetailDto>;
}

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export function GamificationProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const api = useApi();
  const [character, setCharacter] = useState<CharacterDto | null>(null);
  const [epicWins, setEpicWins] = useState<EpicWinSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCharacter = useCallback(async () => {
    const data = await api.get<CharacterDto>("/character");
    setCharacter(data);
  }, [api]);

  const refreshEpicWins = useCallback(async () => {
    const data = await api.get<EpicWinSummaryDto[]>("/epic-wins");
    setEpicWins(data);
  }, [api]);

  useEffect(() => {
    if (status !== "signedIn") {
      setCharacter(null);
      setEpicWins([]);
      return;
    }
    setLoading(true);
    Promise.all([refreshCharacter(), refreshEpicWins()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const value = useMemo<GamificationContextValue>(
    () => ({
      character,
      epicWins,
      loading,
      refreshCharacter,
      refreshEpicWins,
      async createEpicWin(input) {
        const created = await api.post<EpicWinDetailDto>("/epic-wins", input);
        await refreshEpicWins();
        return created;
      },
    }),
    [character, epicWins, loading, refreshCharacter, refreshEpicWins, api],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification должен использоваться внутри <GamificationProvider>");
  return ctx;
}
