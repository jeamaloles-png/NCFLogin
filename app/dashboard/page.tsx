"use client";

import { clearTokens, getUserId } from "@/lib/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useAuthGuard } from "@/hooks/AuthGuard";
import { apiClient } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Game = "LeagueOfLegend" | "Valorant";
type RiotAccount = { id: number; user_id: number; riot_id: string };
type LeagueAccount = {
  id: number;
  riot_id: number;
  summoner_name: string;
  summoner_level?: number;
  rank: string;
};
type ValorantAccount = {
  id: number;
  riot_id: number;
  ign: string;
  agent_name?: string;
  tier: string;
};
type Account = {
  id: number;
  riotRowId: number;
  game: Game;
  ign: string;
  rank: string;
  summonerLevel?: number;
  agentName?: string;
};
type AccountDetails = LeagueAccount | ValorantAccount;

const GAME_LABELS: Record<Game, string> = {
  LeagueOfLegend: "League of Legends",
  Valorant: "VALORANT",
};

const GAME_ENDPOINTS: Record<Game, string> = {
  LeagueOfLegend: "/LeagueOfLegend",
  Valorant: "/Valorant",
};

const getAccountKey = (account: Account) => `${account.game}-${account.id}`;

export default function DashboardPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard({ requireAuth: true });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [game, setGame] = useState<Game>("LeagueOfLegend");
  const [ign, setIgn] = useState("");
  const [rank, setRank] = useState("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<{
    account: Account;
    details: AccountDetails;
  } | null>(null);
  const [actionAccountKey, setActionAccountKey] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const [riotRows, leagueRows, valorantRows] = await Promise.all([
        apiClient<RiotAccount[]>("/RIOT", { method: "GET", requiresAuth: true }),
        apiClient<LeagueAccount[]>("/LeagueOfLegend", { method: "GET", requiresAuth: true }),
        apiClient<ValorantAccount[]>("/Valorant", { method: "GET", requiresAuth: true }),
      ]);
      const myRiotRows = (Array.isArray(riotRows) ? riotRows : []).filter(
        (row) => Number(row.user_id) === userId
      );
      const myRiotIds = new Set(myRiotRows.map((row) => Number(row.id)));
      const riotIdByRowId = new Map(myRiotRows.map((row) => [Number(row.id), row.riot_id]));
      const listed: Account[] = [
        ...(Array.isArray(leagueRows) ? leagueRows : [])
          .filter((row) => myRiotIds.has(Number(row.riot_id)))
          .map((row) => ({
            id: Number(row.id),
            riotRowId: Number(row.riot_id),
            game: "LeagueOfLegend" as const,
            ign: row.summoner_name || riotIdByRowId.get(Number(row.riot_id)) || "",
            rank: row.rank || "Unranked",
            summonerLevel: row.summoner_level,
          })),
        ...(Array.isArray(valorantRows) ? valorantRows : [])
          .filter((row) => myRiotIds.has(Number(row.riot_id)))
          .map((row) => ({
            id: Number(row.id),
            riotRowId: Number(row.riot_id),
            game: "Valorant" as const,
            ign: row.ign || riotIdByRowId.get(Number(row.riot_id)) || "",
            rank: row.tier || "Unranked",
            agentName: row.agent_name,
          })),
      ];
      setAccounts(listed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load game accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isChecking) void fetchAccounts();
  }, [isChecking, fetchAccounts]);

  const handleReadAccount = async (account: Account) => {
    const accountKey = getAccountKey(account);
    setActionAccountKey(accountKey);
    setError("");
    setSuccess("");
    try {
      const details = await apiClient<AccountDetails>(
        `${GAME_ENDPOINTS[account.game]}/${account.id}`,
        { method: "GET", requiresAuth: true }
      );
      setSelectedAccount({ account, details });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the game account.");
    } finally {
      setActionAccountKey(null);
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setSelectedAccount(null);
    setGame(account.game);
    setIgn(account.ign);
    setRank(account.rank === "Unranked" ? "" : account.rank);
    setError("");
    setSuccess("");
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setGame("LeagueOfLegend");
    setIgn("");
    setRank("");
    setError("");
    setSuccess("");
  };

  const handleDeleteAccount = async (account: Account) => {
    const confirmed = window.confirm(
      `Delete ${GAME_LABELS[account.game]} account "${account.ign}"?`
    );
    if (!confirmed) return;

    const accountKey = getAccountKey(account);
    setActionAccountKey(accountKey);
    setError("");
    setSuccess("");
    try {
      await apiClient(`${GAME_ENDPOINTS[account.game]}/${account.id}`, {
        method: "DELETE",
        requiresAuth: true,
      });

      const hasOtherGameAccount = accounts.some(
        (other) =>
          getAccountKey(other) !== accountKey &&
          other.riotRowId === account.riotRowId
      );
      let cleanupError = "";
      if (!hasOtherGameAccount) {
        try {
          await apiClient(`/RIOT/${account.riotRowId}`, {
            method: "DELETE",
            requiresAuth: true,
          });
        } catch (err) {
          cleanupError =
            err instanceof Error ? err.message : "Could not remove the linked Riot profile.";
        }
      }

      setAccounts((current) =>
        current.filter((item) => getAccountKey(item) !== accountKey)
      );
      setSelectedAccount((current) =>
        current && getAccountKey(current.account) === accountKey ? null : current
      );
      if (editingAccount && getAccountKey(editingAccount) === accountKey) {
        handleCancelEdit();
      }
      if (cleanupError) {
        setError(`Account deleted, but its linked Riot profile could not be removed: ${cleanupError}`);
      } else {
        setSuccess("Game account deleted.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the game account.");
    } finally {
      setActionAccountKey(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = getUserId();
    if (!editingAccount && !userId) {
      setError("Your session has expired. Please log in again.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    let riotRowId: number | undefined;
    let gameRowSaved = false;
    try {
      if (editingAccount) {
        const body =
          editingAccount.game === "LeagueOfLegend"
            ? {
                riot_id: editingAccount.riotRowId,
                summoner_name: ign.trim(),
                summoner_level: editingAccount.summonerLevel ?? 1,
                rank: rank.trim() || "Unranked",
              }
            : {
                riot_id: editingAccount.riotRowId,
                ign: ign.trim(),
                agent_name: editingAccount.agentName ?? "",
                tier: rank.trim() || "Unranked",
              };
        await apiClient(
          `${GAME_ENDPOINTS[editingAccount.game]}/${editingAccount.id}`,
          {
            method: "PUT",
            requiresAuth: true,
            body: JSON.stringify(body),
          }
        );
        gameRowSaved = true;
      } else {
        const parent = await apiClient<{ id: number }>("/RIOT", {
          method: "POST",
          requiresAuth: true,
          body: JSON.stringify({ user_id: userId, riot_id: ign.trim() }),
        });
        riotRowId = Number(parent.id);
        if (!riotRowId) throw new Error("The Riot account was saved, but its ID was not returned.");

        if (game === "LeagueOfLegend") {
          await apiClient("/LeagueOfLegend", {
            method: "POST",
            requiresAuth: true,
            body: JSON.stringify({
              riot_id: riotRowId,
              summoner_name: ign.trim(),
              summoner_level: 1,
              rank: rank.trim() || "Unranked",
            }),
          });
        } else {
          await apiClient("/Valorant", {
            method: "POST",
            requiresAuth: true,
            body: JSON.stringify({
              riot_id: riotRowId,
              ign: ign.trim(),
              agent_name: "",
              tier: rank.trim() || "Unranked",
            }),
          });
        }
        gameRowSaved = true;
      }
      setIgn("");
      setRank("");
      setEditingAccount(null);
      setSuccess(editingAccount ? "Game account updated." : "Game account added.");
      await fetchAccounts();
    } catch (err) {
      if (riotRowId && !gameRowSaved) {
        try {
          await apiClient(`/RIOT/${riotRowId}`, { method: "DELETE", requiresAuth: true });
        } catch {
          // Keep the original error visible if cleanup also fails.
        }
      }
      setError(err instanceof Error ? err.message : "Could not add the game account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    router.push(CONFIG.ROUTES.LOGIN);
  };

  const accountCount = useMemo(() => accounts.length, [accounts]);

  if (isChecking) {
    return <div className="game-dashboard game-dashboard-loading"><p>Verifying session...</p></div>;
  }

  return (
    <main className="game-dashboard min-h-screen p-6 md:p-8">
      <div className="game-dashboard-inner mx-auto max-w-5xl space-y-6">
        <header className="game-dashboard-header flex items-center justify-between border-b pb-4">
          <div className="game-dashboard-brand">
            <div className="game-dashboard-mark" aria-hidden="true">NCF</div>
            <div>
              <p className="game-dashboard-eyebrow">NCF GAME HUB <span>{"//"}</span> PLAYER PROFILE</p>
              <h1>Game Accounts</h1>
              <p className="game-dashboard-subtitle">Your game identities, all in one place.</p>
            </div>
          </div>
          <Button className="game-logout" variant="destructive" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
        </header>

        {error && <div role="alert" className="game-alert game-alert-error">{error}</div>}
        {success && <div role="status" className="game-alert game-alert-success">{success}</div>}

        <Card className="game-panel">
          <CardHeader className="game-panel-header">
            <CardTitle>{editingAccount ? "Edit game account" : "Add a game account"}</CardTitle>
            <CardDescription>
              {editingAccount
                ? `Update ${GAME_LABELS[editingAccount.game]} account details.`
                : "Choose a game, then enter the in-game name and current rank."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="game">Game</Label>
                  <select id="game" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={game} onChange={(event) => setGame(event.target.value as Game)} disabled={!!editingAccount}>
                    <option value="LeagueOfLegend">League of Legends</option>
                    <option value="Valorant">VALORANT</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ign">IGN</Label>
                  <Input id="ign" placeholder="Your in-game name" value={ign} onChange={(event) => setIgn(event.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rank">Rank</Label>
                  <Input id="rank" placeholder="e.g. Gold II or Platinum 1" value={rank} onChange={(event) => setRank(event.target.value)} maxLength={60} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingAccount && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={submitting}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={submitting}>
                  {editingAccount ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {submitting ? "Saving..." : editingAccount ? "Save Changes" : "Add Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {selectedAccount && (
          <Card className="game-panel game-account-detail">
            <CardHeader className="game-panel-header game-account-detail-header">
              <div>
                <CardTitle>Account details</CardTitle>
                <CardDescription>
                  Full record for {GAME_LABELS[selectedAccount.account.game]}.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Close account details"
                onClick={() => setSelectedAccount(null)}
              >
                <X />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="game-account-detail-grid">
                <div>
                  <span>Game</span>
                  <strong>{GAME_LABELS[selectedAccount.account.game]}</strong>
                </div>
                <div>
                  <span>In-game name</span>
                  <strong>
                    {"summoner_name" in selectedAccount.details
                      ? selectedAccount.details.summoner_name
                      : selectedAccount.details.ign}
                  </strong>
                </div>
                <div>
                  <span>Rank</span>
                  <strong>
                    {"summoner_name" in selectedAccount.details
                      ? selectedAccount.details.rank || "Unranked"
                      : selectedAccount.details.tier || "Unranked"}
                  </strong>
                </div>
                <div>
                  <span>Account record</span>
                  <strong>#{selectedAccount.details.id}</strong>
                </div>
                <div>
                  <span>Linked Riot profile</span>
                  <strong>#{selectedAccount.details.riot_id}</strong>
                </div>
                {"summoner_name" in selectedAccount.details && (
                  <div>
                    <span>Summoner level</span>
                    <strong>{selectedAccount.details.summoner_level ?? "N/A"}</strong>
                  </div>
                )}
                {"agent_name" in selectedAccount.details && (
                  <div>
                    <span>Favorite agent</span>
                    <strong>{selectedAccount.details.agent_name || "N/A"}</strong>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="game-panel">
          <CardHeader className="game-panel-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Your accounts</CardTitle>
              <CardDescription>{accountCount} game {accountCount === 1 ? "account" : "accounts"} saved.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => void fetchAccounts()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="game-account-table w-full text-sm">
                <thead><tr className="border-b text-left"><th className="p-3 font-medium">Game</th><th className="p-3 font-medium">IGN</th><th className="p-3 font-medium">Rank</th><th className="p-3 text-right font-medium">Actions</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading accounts...</td></tr>
                    : accounts.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No game accounts yet. Add one above.</td></tr>
                    : accounts.map((account) => {
                      const accountKey = getAccountKey(account);
                      const actionLoading = actionAccountKey === accountKey;
                      return (
                        <tr key={accountKey} className="border-b last:border-0">
                          <td className="p-3">{GAME_LABELS[account.game]}</td>
                          <td className="p-3">{account.ign}</td>
                          <td className="p-3">{account.rank || "Unranked"}</td>
                          <td className="p-3">
                            <div className="game-account-actions">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="game-action-read"
                                disabled={actionLoading}
                                onClick={() => void handleReadAccount(account)}
                              >
                                <Eye />Read
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="game-action-edit"
                                onClick={() => handleEditAccount(account)}
                              >
                                <Pencil />Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="game-action-delete"
                                disabled={actionLoading}
                                onClick={() => void handleDeleteAccount(account)}
                              >
                                <Trash2 />Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
