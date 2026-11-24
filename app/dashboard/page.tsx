"use client";

import { clearTokens } from "@/lib/auth";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogOut, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useAuthGuard } from "@/hooks/AuthGuard";
import { apiClient } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Game = { id: number; name: string };
type Account = {
  id: number;
  gameName: string;
  username: string;
  email: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type RevealedAccount = Account & { password: string };

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function DashboardPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard({ requireAuth: true });
  const [games, setGames] = useState<Game[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [gameDialog, setGameDialog] = useState(false);
  const [accountDialog, setAccountDialog] = useState(false);
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [revealed, setRevealed] = useState<RevealedAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadGames = useCallback(async () => {
    const result = await apiClient<Game[]>("/vault/games", { requiresAuth: true });
    setGames(Array.isArray(result) ? result : []);
  }, []);

  const loadAccounts = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const result = await apiClient<Account[]>(`/vault/accounts${suffix}`, { requiresAuth: true });
      setAccounts(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(messageOf(err, "Could not load your game accounts."));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await loadGames();
      await loadAccounts(query);
    } catch (err) {
      setError(messageOf(err, "Could not connect to the game vault."));
    }
  }, [loadAccounts, loadGames, query]);

  useEffect(() => {
    if (!isChecking) void refresh();
  }, [isChecking, refresh]);

  const resetAccountForm = () => {
    setEditing(null);
    setGameId("");
    setUsername("");
    setPassword("");
    setEmail("");
    setNotes("");
    setShowPassword(false);
  };

  const openAddAccount = () => {
    resetAccountForm();
    setAccountDialog(true);
    setError("");
    setSuccess("");
  };

  const openEditAccount = (account: Account) => {
    resetAccountForm();
    setEditing(account);
    const savedGame = games.find((game) => game.name === account.gameName);
    setGameId(savedGame ? String(savedGame.id) : "");
    setUsername(account.username);
    setEmail(account.email || "");
    setNotes(account.notes || "");
    setAccountDialog(true);
    setRevealed(null);
    setError("");
    setSuccess("");
  };

  const addGame = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = gameName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const addedGame = await apiClient<Game>("/vault/games", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({ name }),
      });
      setGameName("");
      if (accountDialog) setGameId(String(addedGame.id));
      await loadGames();
      setSuccess(`${name} added to your game list.`);
    } catch (err) {
      setError(messageOf(err, "Could not add that game."));
    } finally {
      setSaving(false);
    }
  };

  const removeGame = async (game: Game) => {
    if (!window.confirm(`Remove ${game.name} from your game list? Saved accounts for this game will stay in your vault.`)) return;
    setBusyId(game.id);
    setError("");
    try {
      await apiClient(`/vault/games/${game.id}`, { method: "DELETE", requiresAuth: true });
      await loadGames();
      setSuccess(`${game.name} removed from the game list. Saved accounts were kept.`);
    } catch (err) {
      setError(messageOf(err, "Could not remove that game."));
    } finally {
      setBusyId(null);
    }
  };

  const saveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gameId) {
      setError("Choose a game before entering its account details.");
      return;
    }
    if (!editing && !password) {
      setError("Enter the game account password.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const body = {
      gameId: Number(gameId),
      username: username.trim(),
      password,
      email: email.trim(),
      notes: notes.trim(),
    };
    try {
      if (editing) {
        await apiClient(`/vault/accounts/${editing.id}`, {
          method: "PUT",
          requiresAuth: true,
          body: JSON.stringify(body),
        });
      } else {
        await apiClient("/vault/accounts", {
          method: "POST",
          requiresAuth: true,
          body: JSON.stringify(body),
        });
      }
      setAccountDialog(false);
      resetAccountForm();
      setSuccess(editing ? "Game account updated." : "Game account saved in your encrypted vault.");
      await loadAccounts(query);
    } catch (err) {
      setError(messageOf(err, "Could not save the game account."));
    } finally {
      setSaving(false);
    }
  };

  const revealAccount = async (account: Account) => {
    setBusyId(account.id);
    setError("");
    setRevealed(null);
    try {
      const result = await apiClient<RevealedAccount>(`/vault/accounts/${account.id}`, { requiresAuth: true });
      setRevealed(result);
      setShowPassword(false);
    } catch (err) {
      setError(messageOf(err, "Could not reveal that account."));
    } finally {
      setBusyId(null);
    }
  };

  const deleteAccount = async (account: Account) => {
    if (!window.confirm(`Delete the saved ${account.gameName} account for ${account.username}?`)) return;
    setBusyId(account.id);
    setError("");
    try {
      await apiClient(`/vault/accounts/${account.id}`, { method: "DELETE", requiresAuth: true });
      setRevealed(null);
      setSuccess("Game account deleted.");
      await loadAccounts(query);
    } catch (err) {
      setError(messageOf(err, "Could not delete the game account."));
    } finally {
      setBusyId(null);
    }
  };

  const logout = () => {
    clearTokens();
    router.push(CONFIG.ROUTES.LOGIN);
  };

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
              <p className="game-dashboard-eyebrow">NCF GAME HUB <span>{"//"}</span> PLAYER VAULT</p>
              <h1>Game Accounts</h1>
              <p className="game-dashboard-subtitle">Keep your game logins together in one encrypted vault.</p>
            </div>
          </div>
          <Button className="game-logout" variant="destructive" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
        </header>

        {error && <div role="alert" className="game-alert game-alert-error">{error}</div>}
        {success && <div role="status" className="game-alert game-alert-success">{success}</div>}

        <Card className="game-panel">
          <CardHeader className="game-panel-header vault-toolbar">
            <div>
              <CardTitle>Your vault</CardTitle>
              <CardDescription>{accounts.length} saved account{accounts.length === 1 ? "" : "s"} · Passwords are encrypted before they reach MySQL.</CardDescription>
            </div>
            <div className="vault-toolbar-actions">
              <Button type="button" variant="outline" onClick={() => { setGameDialog(true); setError(""); }}><Pencil className="mr-2 h-4 w-4" />Manage games</Button>
              <Button type="button" onClick={openAddAccount}><Plus className="mr-2 h-4 w-4" />Add account</Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="vault-search" onSubmit={(event) => { event.preventDefault(); void loadAccounts(query); }}>
              <div className="vault-search-field">
                <Search aria-hidden="true" />
                <Input aria-label="Search game accounts" placeholder="Search game, username, email, or notes" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Button type="submit" variant="outline">Search</Button>
              <Button type="button" variant="outline" aria-label="Refresh accounts" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
            </form>

            {!games.length && (
              <div className="vault-empty">
                <strong>Add a game to get started.</strong>
                <span>Choose your game names first, then add their usernames and passwords.</span>
                <Button type="button" onClick={() => setGameDialog(true)}><Plus className="mr-2 h-4 w-4" />Add your first game</Button>
              </div>
            )}

            <div className="game-account-table-wrap">
              <table className="game-account-table w-full text-left text-sm">
                <thead><tr><th>Game</th><th>Username</th><th>Email</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.gameName}</td>
                      <td>{account.username}</td>
                      <td>{account.email || "—"}</td>
                      <td>
                        <div className="game-account-actions">
                          <Button type="button" variant="outline" size="sm" disabled={busyId === account.id} onClick={() => void revealAccount(account)}><Eye className="mr-1" />Reveal</Button>
                          <Button type="button" variant="outline" size="sm" disabled={busyId === account.id} onClick={() => openEditAccount(account)}><Pencil className="mr-1" />Edit</Button>
                          <Button type="button" variant="destructive" size="sm" className="game-action-delete" disabled={busyId === account.id} onClick={() => void deleteAccount(account)}><Trash2 className="mr-1" />Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && accounts.length === 0 && games.length > 0 && (
                <p className="vault-no-results">{query ? "No accounts match that search." : "No accounts saved yet. Add one after choosing a game."}</p>
              )}
              {loading && <p className="vault-no-results">Loading accounts…</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {gameDialog && (
        <div className="game-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGameDialog(false); }}>
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="manage-games-title">
            <header className="game-modal-header"><div><h2 id="manage-games-title">Manage games</h2><p>Add games to your list before saving their login details.</p></div><Button type="button" variant="outline" size="icon" aria-label="Close game manager" onClick={() => setGameDialog(false)}><X /></Button></header>
            <form className="manage-game-form" onSubmit={(event) => void addGame(event)}>
              <div><Label htmlFor="new-game">Game name</Label><Input id="new-game" placeholder="e.g. VALORANT" maxLength={80} value={gameName} onChange={(event) => setGameName(event.target.value)} required /></div>
              <Button type="submit" disabled={saving}><Plus className="mr-1 h-4 w-4" />Add game</Button>
            </form>
            <div className="manage-game-list">
              {games.length ? games.map((game) => (
                <div className="manage-game-row" key={game.id}><span>{game.name}</span><Button type="button" variant="outline" size="sm" className="game-action-delete" disabled={busyId === game.id} onClick={() => void removeGame(game)}><Trash2 className="mr-1 h-4 w-4" />Remove</Button></div>
              )) : <p>No games yet. Add a game above.</p>}
            </div>
          </section>
        </div>
      )}

      {accountDialog && (
        <div className="game-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAccountDialog(false); resetAccountForm(); } }}>
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="account-form-title">
            <header className="game-modal-header"><div><h2 id="account-form-title">{editing ? "Edit game account" : "Add a game account"}</h2><p>Select a game first, then enter its account details.</p></div><Button type="button" variant="outline" size="icon" aria-label="Close account form" onClick={() => { setAccountDialog(false); resetAccountForm(); }}><X /></Button></header>
            <form className="vault-account-form" onSubmit={(event) => void saveAccount(event)}>
              <div><Label htmlFor="game-choice">Game</Label><select id="game-choice" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={gameId} onChange={(event) => setGameId(event.target.value)} required><option value="">Choose a game</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div>
              {!games.length && <div className="vault-no-results">No games in your list yet. <Button type="button" variant="outline" onClick={() => setGameDialog(true)}>Add a game</Button></div>}
              {gameId && <>
                <div><Label htmlFor="game-username">Game username</Label><Input id="game-username" autoComplete="off" maxLength={120} value={username} onChange={(event) => setUsername(event.target.value)} required /></div>
                <div><Label htmlFor="game-password">Game password</Label><div className="vault-password-input"><Input id="game-password" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={2048} placeholder={editing ? "Leave blank to keep the saved password" : "Enter the game password"} value={password} onChange={(event) => setPassword(event.target.value)} required={!editing} /><Button type="button" variant="outline" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>
                <div><Label htmlFor="game-email">Email (optional)</Label><Input id="game-email" type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div><Label htmlFor="game-notes">Notes (optional)</Label><textarea id="game-notes" className="vault-notes-input" maxLength={4000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
                <div className="vault-encryption-note">Your game password is encrypted on the API before it is stored in MySQL.</div>
              </>}
              <footer className="game-modal-actions"><Button type="button" variant="outline" onClick={() => { setAccountDialog(false); resetAccountForm(); }} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || !gameId}>{saving ? "Saving…" : editing ? "Save changes" : "Save account"}</Button></footer>
            </form>
          </section>
        </div>
      )}

      {revealed && (
        <div className="game-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRevealed(null); }}>
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
            <header className="game-modal-header"><div><h2 id="reveal-title">Saved account</h2><p>{revealed.gameName}</p></div><Button type="button" variant="outline" size="icon" aria-label="Close account details" onClick={() => setRevealed(null)}><X /></Button></header>
            <div className="vault-revealed-details"><div><span>Username</span><strong>{revealed.username}</strong></div><div><span>Password</span><div className="vault-password-input"><Input readOnly type={showPassword ? "text" : "password"} value={revealed.password} /><Button type="button" variant="outline" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>{revealed.email && <div><span>Email</span><strong>{revealed.email}</strong></div>}{revealed.notes && <div><span>Notes</span><strong>{revealed.notes}</strong></div>}</div>
          </section>
        </div>
      )}
    </main>
  );
}
