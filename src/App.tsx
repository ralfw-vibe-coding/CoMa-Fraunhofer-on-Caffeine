import { type CSSProperties, useEffect, useState } from "react";
import horrorvacuiImage from "@/assets/horrorvacui.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ParticipantListItem = {
  participantRegisteredId: string;
  displayName: string;
};

type RankingResult = {
  ranking: string[];
  urgency: "low" | "medium" | "high";
  isSupplyDepleted: boolean;
  cupsDrawnSinceSupplyDepleted: number;
};

type CommandResponse = {
  status: boolean;
  message: string;
  eventId?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

const topRankingUrgencyStyles: Record<RankingResult["urgency"], string> = {
  low: "border-lime-300 bg-lime-200 text-lime-950 hover:bg-lime-200",
  medium: "border-amber-300/70 bg-amber-100 text-amber-900 hover:bg-amber-100",
  high: "border-red-300 bg-red-100 text-red-900 hover:bg-red-100",
};

const amountInputClassName =
  "h-11 w-full rounded-[0.85rem] border border-black/40 bg-card px-4 text-center text-sm text-foreground outline-none transition placeholder:text-[#9b938d] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#1d120e] disabled:text-[#7b6b63]";

export default function App() {
  const [participants, setParticipants] = useState<ParticipantListItem[]>([]);
  const [nextToBuyCoffee, setNextToBuyCoffee] = useState<RankingResult>({
    ranking: [],
    urgency: "low",
    isSupplyDepleted: false,
    cupsDrawnSinceSupplyDepleted: 0,
  });
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoffeeSteamOverlay, setShowCoffeeSteamOverlay] = useState(false);
  const [showSupplyDepletedOverlay, setShowSupplyDepletedOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canReportCoffeeDrawn = selectedParticipantId !== null;
  const canReportCoffeePurchased =
    selectedParticipantId !== null &&
    Number.isFinite(Number.parseFloat(purchaseAmount)) &&
    Number.parseFloat(purchaseAmount) > 0;

  useEffect(() => {
    if (!showConfetti) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowConfetti(false);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showConfetti]);

  useEffect(() => {
    if (!showCoffeeSteamOverlay) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCoffeeSteamOverlay(false);
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showCoffeeSteamOverlay]);

  useEffect(() => {
    if (!showSupplyDepletedOverlay) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSupplyDepletedOverlay(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSupplyDepletedOverlay]);

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [participantsResponse, rankingResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/participants`),
        fetch(`${apiBaseUrl}/ranking`),
      ]);

      if (!participantsResponse.ok || !rankingResponse.ok) {
        throw new Error("Die Daten konnten nicht geladen werden.");
      }

      const participantsResult = (await participantsResponse.json()) as {
        participants: ParticipantListItem[];
      };
      const rankingResult = (await rankingResponse.json()) as RankingResult;

      setParticipants(participantsResult.participants);
      setNextToBuyCoffee(rankingResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Daten konnten nicht geladen werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetSelection() {
    setSelectedParticipantId(null);
    setPurchaseAmount("");
  }

  function handleParticipantClick(participantRegisteredId: string) {
    setSelectedParticipantId((currentId) =>
      currentId === participantRegisteredId ? null : participantRegisteredId,
    );
    setPurchaseAmount("");
    setErrorMessage(null);
  }

  async function postCommand<TRequest extends Record<string, unknown>>(
    endpoint: string,
    body: TRequest,
  ) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as CommandResponse;

    if (!response.ok || !result.status) {
      throw new Error(result.message || "Die Aktion konnte nicht gespeichert werden.");
    }
  }

  async function handleCoffeeDrawn() {
    if (!canReportCoffeeDrawn || !selectedParticipantId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await postCommand("/coffee/drawn", {
        participantRegisteredId: selectedParticipantId,
      });
      await refreshData();
      setShowCoffeeSteamOverlay(true);
      resetSelection();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der Kaffeezug konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCoffeePurchased() {
    if (!canReportCoffeePurchased || !selectedParticipantId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await postCommand("/coffee/purchased", {
        participantRegisteredId: selectedParticipantId,
        amountEuro: Number.parseFloat(purchaseAmount),
      });
      await refreshData();
      setShowConfetti(true);
      resetSelection();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der Kaffeekauf konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCoffeeSupplyDepleted() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await postCommand("/coffee/supply-depleted", {});
      await refreshData();
      setShowSupplyDepletedOverlay(true);
      resetSelection();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der leere Vorrat konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      {showConfetti ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          {Array.from({ length: 64 }, (_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={
                {
                  left: `${(index * 11) % 100}%`,
                  animationDelay: `${(index % 12) * 70}ms`,
                  animationDuration: `${1600 + (index % 5) * 220}ms`,
                  transform: `translate3d(0, 0, 0) rotate(${index * 18}deg) scale(${
                    0.75 + (index % 4) * 0.18
                  })`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}

      {showCoffeeSteamOverlay ? (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-6">
          <div
            aria-hidden="true"
            className="steam-overlay flex flex-col items-center gap-3 rounded-[2rem] border border-[#ffe4cf]/35 bg-[#2a1712]/80 px-8 py-7 backdrop-blur-sm"
          >
            <div className="steam-cup">
              <span className="steam-line steam-line-one" />
              <span className="steam-line steam-line-two" />
              <span className="steam-line steam-line-three" />
              <span className="steam-cup-rim" />
              <span className="steam-cup-body" />
              <span className="steam-cup-handle" />
              <span className="steam-cup-saucer" />
            </div>
          </div>
        </div>
      ) : null}

      {showSupplyDepletedOverlay ? (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-6">
          <div
            aria-hidden="true"
            className="panic-overlay flex items-center justify-center rounded-[2rem] border border-[#ffd4cf]/35 bg-[#2a1712]/82 px-8 py-7 backdrop-blur-sm"
          >
            <img
              alt=""
              src={horrorvacuiImage}
              className="panic-image h-28 w-28 rounded-[1.4rem] object-cover"
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-sm justify-center">
        <Card className="w-full max-w-[22rem] rounded-[2rem] px-4 py-5">
          <section className="space-y-6">
            <header className="space-y-3 text-center">
              <h1 className="text-[2rem] font-black tracking-tight">CoMa</h1>
              {errorMessage ? (
                <p className="text-sm text-[#ff9f9b]">{errorMessage}</p>
              ) : null}
            </header>

            <section className="space-y-2">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 px-2">
                {participants.map((participant) => {
                  const isSelected =
                    participant.participantRegisteredId === selectedParticipantId;

                  return (
                    <Button
                      key={participant.participantRegisteredId}
                      variant={isSelected ? "secondary" : "default"}
                      size="tile"
                      disabled={isLoading || isSubmitting}
                      onClick={() =>
                        handleParticipantClick(participant.participantRegisteredId)
                      }
                    >
                      {participant.displayName}
                    </Button>
                  );
                })}

                <div className="col-span-2 flex justify-end">
                  <input
                    aria-label="Kaffeebetrag in Euro"
                    inputMode="decimal"
                    placeholder="Betrag €"
                    value={purchaseAmount}
                    disabled={selectedParticipantId === null || isSubmitting}
                    onChange={(event) => setPurchaseAmount(event.target.value)}
                    className={cn(amountInputClassName, "max-w-[8.6rem]")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="mint"
                  disabled={!canReportCoffeeDrawn || isSubmitting}
                  onClick={handleCoffeeDrawn}
                >
                  Kaffee gezogen
                </Button>
                <Button
                  variant="pink"
                  disabled={!canReportCoffeePurchased || isSubmitting}
                  onClick={handleCoffeePurchased}
                >
                  Kaffee gekauft
                </Button>
              </div>
            </section>

            <section>
              <Button
                variant="danger"
                size="banner"
                disabled={isSubmitting}
                onClick={handleCoffeeSupplyDepleted}
              >
                Vorrat leer!
              </Button>
            </section>

            {nextToBuyCoffee.isSupplyDepleted ? (
              <section className="rounded-[1.25rem] border border-red-300/40 bg-red-100/10 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase leading-[1.25] tracking-[0.18em] text-red-200">
                    Verbrauch seit
                    <br />
                    Leer-Meldung
                  </p>
                  <p className="text-[2rem] font-black leading-none text-white">
                    {nextToBuyCoffee.cupsDrawnSinceSupplyDepleted}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-[1.1rem] font-bold">Der Vorrat braucht dich:</h2>
              <div className="space-y-1.5 px-10">
                {nextToBuyCoffee.ranking.length > 0 ? (
                  nextToBuyCoffee.ranking.map((displayName, index) => (
                    <Button
                      key={displayName}
                      variant={index === 0 ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "flex w-full",
                        index === 0
                          ? topRankingUrgencyStyles[nextToBuyCoffee.urgency]
                          : undefined,
                      )}
                    >
                      {displayName}
                    </Button>
                  ))
                ) : (
                  <p className="px-2 text-center text-sm text-[#c9b4aa]">
                    Noch keine Rangliste verfügbar.
                  </p>
                )}
              </div>
            </section>
          </section>
        </Card>
      </div>
    </main>
  );
}
