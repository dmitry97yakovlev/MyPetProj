import type { CreateEpicWinInput, EpicWinDetailDto, EpicWinSummaryDto } from "@mypetproj/shared";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../lib/useApi";

interface GamificationContextValue {
  epicWins: EpicWinSummaryDto[];
  loading: boolean;
  refreshEpicWins: () => Promise<void>;
  createEpicWin: (input: CreateEpicWinInput) => Promise<EpicWinDetailDto>;
}

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export function GamificationProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const api = useApi();
  const [epicWins, setEpicWins] = useState<EpicWinSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshEpicWins = useCallback(async () => {
    const data = await api.get<EpicWinSummaryDto[]>("/epic-wins");
    setEpicWins(data);
  }, [api]);

  useEffect(() => {
    if (status !== "signedIn") {
      setEpicWins([]);
      return;
    }
    setLoading(true);
    refreshEpicWins().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const value = useMemo<GamificationContextValue>(
    () => ({
      epicWins,
      loading,
      refreshEpicWins,
      async createEpicWin(input) {
        const created = await api.post<EpicWinDetailDto>("/epic-wins", input);
        await refreshEpicWins();
        return created;
      },
    }),
    [epicWins, loading, refreshEpicWins, api],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification должен использоваться внутри <GamificationProvider>");
  return ctx;
}
