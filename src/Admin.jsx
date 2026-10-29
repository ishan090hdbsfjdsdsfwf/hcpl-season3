
import React from 'react';
import * as XLSX from 'xlsx';
import './admin.css';

const API = `${import.meta.env.VITE_API_URL || ''}/api/admin`;

function money(paise = 0) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format((Number(paise) || 0) / 100);
}

function dateLabel(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
}

export default function AdminPage() {
    const [token, setToken] = React.useState(
        () => sessionStorage.getItem('hcpl_admin_token') || ''
    );
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loginLoading, setLoginLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [summary, setSummary] = React.useState(null);
    const [players, setPlayers] = React.useState([]);
    const [search, setSearch] = React.useState('');
    const [status, setStatus] = React.useState('all');
    const [lastUpdated, setLastUpdated] = React.useState(null);
    const [showPlayerForm, setShowPlayerForm] = React.useState(false);
    const [editingPlayer, setEditingPlayer] = React.useState(null);
    const [savingPlayer, setSavingPlayer] = React.useState(false);
    const [paymentPlayer, setPaymentPlayer] = React.useState(null);
    const [paymentMethod, setPaymentMethod] = React.useState('cash');
    const [paymentReference, setPaymentReference] = React.useState('');
    const [savingPayment, setSavingPayment] = React.useState(false);

    const emptyPlayer = {
        fullName: '',
        phone: '',
        fatherName: '',
        dateOfBirth: '',
        age: '',
        address: '',
        district: 'Hamirpur',
        pincode: '',
        battingHand: 'Right Hand',
        wicketKeeper: false,
        fastBowling: '',
        spinBowling: '',
        kitSize: 'M'
    };

    const [playerForm, setPlayerForm] = React.useState({ ...emptyPlayer });

    const request = React.useCallback(async (path, options = {}) => {
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem('hcpl_admin_token');
            setToken('');
            throw new Error(
                data.message || 'Your admin session expired. Please sign in again.'
            );
        }

        if (!response.ok) {
            throw new Error(data.message || 'Request failed. Please try again.');
        }

        return data;
    }, [token]);

    const loadDashboard = React.useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams();
            if (search.trim()) query.set('search', search.trim());
            if (status !== 'all') query.set('status', status);

            const [summaryData, registrationsData] = await Promise.all([
                request('/summary'),
                request(`/registrations?${query.toString()}`)
            ]);

            setSummary(summaryData);
            setPlayers(registrationsData.registrations || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || 'Could not load dashboard.');
        } finally {
            setLoading(false);
        }
    }, [token, search, status, request]);

    React.useEffect(() => {
        if (token) loadDashboard();
    }, [token, loadDashboard]);

    async function handleLogin(event) {
        event.preventDefault();
        setLoginLoading(true);
        setError('');

        try {
            const response = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Admin login failed.');
            }

            sessionStorage.setItem('hcpl_admin_token', data.token);
            setToken(data.token);
            setPassword('');
        } catch (err) {
            setError(err.message || 'Unable to sign in.');
        } finally {
            setLoginLoading(false);
        }
    }

    function openAddPlayer() {
        setEditingPlayer(null);
        setPlayerForm({ ...emptyPlayer });
        setError('');
        setShowPlayerForm(true);
    }

    function openEditPlayer(player) {
        setEditingPlayer(player);
        setPlayerForm({
            ...emptyPlayer,
            ...player,
            dateOfBirth: player.dateOfBirth
                ? new Date(player.dateOfBirth).toISOString().slice(0, 10)
                : '',
            age: player.age ?? '',
            wicketKeeper: Boolean(player.wicketKeeper),
            district: player.district || 'Hamirpur'
        });
        setError('');
        setShowPlayerForm(true);
    }

    async function savePlayer(event) {
        event.preventDefault();
        setSavingPlayer(true);
        setError('');

        try {
            const payload = {
                fullName: playerForm.fullName,
                phone: playerForm.phone,
                fatherName: playerForm.fatherName,
                dateOfBirth: playerForm.dateOfBirth,
                age: playerForm.age === '' ? '' : Number(playerForm.age),
                address: playerForm.address,
                district: 'Hamirpur',
                pincode: playerForm.pincode,
                battingHand: playerForm.battingHand,
                wicketKeeper: Boolean(playerForm.wicketKeeper),
                fastBowling: playerForm.fastBowling,
                spinBowling: playerForm.spinBowling,
                kitSize: playerForm.kitSize
            };

            const path = editingPlayer
                ? `/registrations/${editingPlayer._id}`
                : '/registrations';

            await request(path, {
                method: editingPlayer ? 'PATCH' : 'POST',
                body: JSON.stringify(payload)
            });

            setShowPlayerForm(false);
            setEditingPlayer(null);
            await loadDashboard();
        } catch (err) {
            setError(err.message || 'Could not save player.');
        } finally {
            setSavingPlayer(false);
        }
    }

    function openOfflinePayment(player) {
        if (player.paymentStatus === 'paid') {
            setError('This registration is already marked as paid.');
            return;
        }

        setError('');
        setPaymentPlayer(player);
        setPaymentMethod('cash');
        setPaymentReference('');
    }

    async function confirmOfflinePayment(event) {
        event.preventDefault();

        if (!paymentPlayer || savingPayment) return;

        const confirmed = window.confirm(
            `Confirm that ₹${(Number(paymentPlayer.feePaise || 70000) / 100).toFixed(0)} was actually received by ${paymentMethod.toUpperCase()} for ${paymentPlayer.fullName}?`
        );

        if (!confirmed) return;

        setSavingPayment(true);
        setError('');

        try {
            await request(
                `/registrations/${paymentPlayer._id}/offline-payment`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        method: paymentMethod,
                        reference: paymentMethod === 'upi'
                            ? paymentReference.trim()
                            : ''
                    })
                }
            );

            setPaymentPlayer(null);
            setPaymentReference('');
            await loadDashboard();
        } catch (err) {
            setError(err.message || 'Could not record offline payment.');
        } finally {
            setSavingPayment(false);
        }
    }

    async function deletePlayer(player) {
        if (player.paymentStatus === 'paid') {
            setError(
                'This player has a paid registration. Keep the payment record intact.'
            );
            return;
        }

        const confirmed = window.confirm(
            `Delete registration for ${player.fullName || 'this player'}? This action cannot be undone.`
        );

        if (!confirmed) return;

        setError('');

        try {
            await request(`/registrations/${player._id}`, {
                method: 'DELETE'
            });
            await loadDashboard();
        } catch (err) {
            setError(err.message || 'Could not delete registration.');
        }
    }

    function logout() {
        sessionStorage.removeItem('hcpl_admin_token');
        setToken('');
        setSummary(null);
        setPlayers([]);
        setError('');
    }


    async function exportCsv() {
        setError('');

        try {
            const data = await request('/cricauction-export');
            const players = data.players || [];

            const headers = [
                'No', 'NAME', 'PHONE', 'PHOTO', 'AGE', 'SKILL',
                'SPECIFICATION 1', 'SPECIFICATION 2', 'SPECIFICATION 3',
                'CATEGORY', 'EXTRA DETAILS', 'JERSEY NAME', 'JERSEY NO',
                'JERSEY SIZE', 'TROUSER SIZE', 'BASE VALUE', 'MATCH',
                'RUN', 'WICKET', 'CUSTOM DATA', 'INFO 1', 'INFO 2',
                'INFO 3', 'INFO 4', 'INFO 5', 'INFO 6',
                'UPLOAD IMAGE 1', 'UPLOAD IMAGE 2'
            ];

            const rows = players.map(p => [
                p.no,
                p.name,
                p.phone,
                p.photo,
                p.age,
                p.skill,
                p.specification1,
                p.specification2,
                p.specification3,
                p.category,
                p.extraDetails,
                p.jerseyName,
                p.jerseyNo,
                p.jerseySize,
                p.trouserSize,
                p.baseValue,
                p.match,
                p.run,
                p.wicket,
                p.customData,
                p.info1,
                p.info2,
                p.info3,
                p.info4,
                p.info5,
                p.info6,
                p.uploadImage1,
                p.uploadImage2
            ]);

            const escapeCsv = value => {
                const text = value == null ? '' : String(value);
                return `"${text.replace(/"/g, '""')}"`;
            };

            const csv = [
                headers.map(escapeCsv).join(','),
                ...rows.map(row => row.map(escapeCsv).join(','))
            ].join('\r\n');

            const blob = new Blob(['\uFEFF', csv], {
                type: 'text/csv;charset=utf-8;'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'hcpl-cricauction-import.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            setError(error.message || 'Could not export CricAuction CSV.');
        }
    }

    if (!token) {
        return (
            <main className="admin-page admin-login-page">
                <section className="admin-login-card">
                    <div className="admin-mark">HC<span>PL</span></div>
                    <p className="admin-kicker">SEASON 3 · MANAGEMENT PORTAL</p>
                    <h1>Admin <em>Login</em></h1>
                    <p className="admin-muted">
                        Sign in to manage player registrations and payment records.
                    </p>

                    <form onSubmit={handleLogin} className="admin-login-form">
                        <label>
                            Admin username
                            <input
                                autoComplete="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Password
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </label>

                        {error && <div className="admin-error" role="alert">{error}</div>}

                        <button className="admin-primary" disabled={loginLoading}>
                            {loginLoading ? 'Signing in…' : 'Sign in securely'}
                        </button>
                    </form>

                    <a className="admin-back-link" href="/">← Back to HCPL website</a>
                </section>
            </main>
        );
    }

    return (
        <main className="admin-page">
            <header className="admin-topbar">
                <a className="admin-brand" href="/">
                    <span className="admin-mark small">HC<span>PL</span></span>
                    <span>HCPL <small>ADMIN PANEL</small></span>
                </a>

                <div className="admin-top-actions">
                    <a href="/" className="admin-secondary">View website</a>
                    <button className="admin-secondary" onClick={logout}>Log out</button>
                </div>
            </header>

            <section className="admin-content">
                <div className="admin-page-heading">
                    <div>
                        <p className="admin-kicker">HARSHIT CUP · SEASON 3</p>
                        <h1>Tournament <em>Dashboard</em></h1>
                        <p className="admin-muted">
                            Player registrations and payment overview.
                        </p>
                    </div>

                    <button
                        className="admin-primary refresh-button"
                        onClick={loadDashboard}
                        disabled={loading}
                    >
                        {loading ? 'Refreshing…' : '↻ Refresh data'}
                    </button>
                </div>

                {error && <div className="admin-error" role="alert">{error}</div>}

                <div className="admin-stat-grid">
                    <article className="admin-stat">
                        <span>Total registrations</span>
                        <strong>{summary?.totalRegistrations ?? '—'}</strong>
                        <small>All submitted entries</small>
                    </article>

                    <article className="admin-stat">
                        <span>Paid registrations</span>
                        <strong>{summary?.paidRegistrations ?? '—'}</strong>
                        <small className="admin-green">Payments recorded as paid</small>
                    </article>

                    <article className="admin-stat">
                        <span>Pending payments</span>
                        <strong>{summary?.pendingRegistrations ?? '—'}</strong>
                        <small>Not yet confirmed</small>
                    </article>

                    <article className="admin-stat">
                        <span>Fees collected</span>
                        <strong>
                            {summary ? money(summary.totalCollectedPaise) : '—'}
                        </strong>
                        <small>Registrations marked paid</small>
                    </article>
                </div>

                <section className="admin-table-panel">
                    <div className="admin-table-heading">
                        <div>
                            <h2>Player registrations</h2>
                            <p className="admin-muted">
                                Personal information is visible only inside this protected admin area.
                            </p>
                        </div>

                        <div className="admin-top-actions">
                            <button className="admin-primary" onClick={openAddPlayer}>
                                + Add Player
                            </button>
                            <button
                                className="admin-primary"
                                onClick={exportCsv}
                                disabled={!players.length}
                            >
                                Export CSV
                            </button>
                            <button
                                className="admin-primary"
                                onClick={exportCricAuction}
                                disabled={!players.length}
                                title="Download the CricAuction-compatible Excel template with public photo URLs"
                            >
                                Export CricAuction Excel
                            </button>
                        </div>
                    </div>

                    <div className="admin-filters">
                        <input
                            aria-label="Search registrations"
                            placeholder="Search name, phone or registration ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && loadDashboard()}
                        />

                        <select
                            aria-label="Payment status"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            <option value="all">All payment statuses</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>

                        <button className="admin-secondary" onClick={loadDashboard}>
                            Search
                        </button>
                    </div>

                    <div className="admin-table-scroll">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Contact</th>
                                    <th>District</th>
                                    <th>Skills</th>
                                    <th>Kit</th>
                                    <th>Fee</th>
                                    <th>Payment</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {players.map(player => (
                                    <tr key={player._id}>

                                        <td>
                                            <div className="admin-player-info">
                                                {player.playerPhoto &&
                                                    player.playerPhoto.startsWith('data:image/') ? (
                                                    <img
                                                        src={player.playerPhoto}
                                                        alt={player.fullName || 'Player'}
                                                        className="admin-player-photo"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="admin-player-photo admin-player-photo-placeholder">
                                                        {(player.fullName || 'P').charAt(0).toUpperCase()}
                                                    </div>
                                                )}

                                                <div className="admin-player-details">
                                                    <strong>{player.fullName || '—'}</strong>
                                                    <small>{player.registrationId}</small>
                                                </div>
                                            </div>
                                        </td>


                                        <td>
                                            {player.phone || '—'}
                                            <small>
                                                {player.fatherName ? `Father: ${player.fatherName}` : ''}
                                            </small>
                                        </td>

                                        <td>
                                            {player.district || '—'}
                                            <small>{player.pincode || ''}</small>
                                        </td>

                                        <td>
                                            {player.battingHand || '—'}
                                            <small>
                                                {[
                                                    player.fastBowling,
                                                    player.spinBowling,
                                                    player.wicketKeeper ? 'Wicket Keeper' : ''
                                                ].filter(Boolean).join(' · ')}
                                            </small>
                                        </td>

                                        <td>{player.kitSize || '—'}</td>
                                        <td>{money(player.feePaise)}</td>

                                        <td>
                                            <span className={`admin-status ${player.paymentStatus || 'pending'}`}>
                                                {player.paymentStatus || 'pending'}
                                            </span>
                                            <small>
                                                {player.offlinePaymentMethod
                                                    ? `Offline: ${player.offlinePaymentMethod.toUpperCase()}`
                                                    : player.razorpayPaymentId || ''}
                                            </small>
                                        </td>

                                        <td>{dateLabel(player.createdAt)}</td>

                                        <td>
                                            <div className="admin-row-actions">
                                                <button
                                                    type="button"
                                                    className="admin-secondary"
                                                    onClick={() => openEditPlayer(player)}
                                                >
                                                    Edit
                                                </button>

                                                {player.paymentStatus !== 'paid' && (
                                                    <button
                                                        type="button"
                                                        className="admin-primary"
                                                        onClick={() => openOfflinePayment(player)}
                                                    >
                                                        Mark as Paid
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="admin-danger"
                                                    disabled={player.paymentStatus === 'paid'}
                                                    onClick={() => deletePlayer(player)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {!players.length && (
                                    <tr>
                                        <td colSpan="9" className="admin-empty">
                                            {loading
                                                ? 'Loading registrations…'
                                                : 'No registrations match this search.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-table-footer">
                        <span>
                            {players.length} registration(s) shown · maximum 500 per query
                        </span>
                        <span>
                            {lastUpdated
                                ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}`
                                : ''}
                        </span>
                    </div>
                </section>

                {showPlayerForm && (
                    <div
                        className="admin-modal-backdrop"
                        onMouseDown={event => {
                            if (event.target === event.currentTarget) {
                                setShowPlayerForm(false);
                            }
                        }}
                    >
                        <section
                            className="admin-player-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="admin-player-modal-title"
                        >
                            <div className="admin-modal-heading">
                                <div>
                                    <h2 id="admin-player-modal-title">
                                        {editingPlayer ? 'Edit Player' : 'Add Player'}
                                    </h2>
                                    <p className="admin-muted">
                                        New registrations are saved with pending payment.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="admin-secondary"
                                    onClick={() => setShowPlayerForm(false)}
                                >
                                    Close
                                </button>
                            </div>

                            <form onSubmit={savePlayer} className="admin-player-form">
                                <label>
                                    Full name
                                    <input
                                        value={playerForm.fullName}
                                        onChange={e => setPlayerForm(p => ({ ...p, fullName: e.target.value }))}
                                        minLength={2}
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label>
                                    Mobile number
                                    <input
                                        value={playerForm.phone}
                                        onChange={e => setPlayerForm(p => ({ ...p, phone: e.target.value }))}
                                        inputMode="numeric"
                                        pattern="[6-9][0-9]{9}"
                                        maxLength={10}
                                        required
                                    />
                                </label>

                                <label>
                                    Father's name
                                    <input
                                        value={playerForm.fatherName || ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, fatherName: e.target.value }))}
                                        maxLength={100}
                                    />
                                </label>

                                <label>
                                    Date of birth
                                    <input
                                        type="date"
                                        value={playerForm.dateOfBirth || ''}
                                        max={new Date().toISOString().slice(0, 10)}
                                        onChange={e => setPlayerForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label>
                                    Age
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={playerForm.age ?? ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, age: e.target.value }))}
                                    />
                                </label>

                                <label>
                                    PIN code
                                    <input
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        value={playerForm.pincode || ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, pincode: e.target.value }))}
                                    />
                                </label>

                                <label className="admin-field-wide">
                                    Address
                                    <textarea
                                        value={playerForm.address || ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, address: e.target.value }))}
                                        minLength={8}
                                        maxLength={300}
                                        required
                                        rows={3}
                                    />
                                </label>

                                <label>
                                    District
                                    <input value="Hamirpur" disabled />
                                </label>

                                <label>
                                    Batting hand
                                    <select
                                        value={playerForm.battingHand || 'Right Hand'}
                                        onChange={e => setPlayerForm(p => ({ ...p, battingHand: e.target.value }))}
                                    >
                                        <option>Right Hand</option>
                                        <option>Left Hand</option>
                                    </select>
                                </label>

                                <label>
                                    Fast bowling
                                    <input
                                        value={playerForm.fastBowling || ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, fastBowling: e.target.value }))}
                                        maxLength={40}
                                        placeholder="e.g. Fast-Medium"
                                    />
                                </label>

                                <label>
                                    Spin bowling
                                    <input
                                        value={playerForm.spinBowling || ''}
                                        onChange={e => setPlayerForm(p => ({ ...p, spinBowling: e.target.value }))}
                                        maxLength={60}
                                        placeholder="e.g. Off-Spinner"
                                    />
                                </label>

                                <label>
                                    Kit size
                                    <select
                                        value={playerForm.kitSize || 'M'}
                                        onChange={e => setPlayerForm(p => ({ ...p, kitSize: e.target.value }))}
                                    >
                                        {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="admin-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(playerForm.wicketKeeper)}
                                        onChange={e => setPlayerForm(p => ({ ...p, wicketKeeper: e.target.checked }))}
                                    />
                                    Wicket keeper
                                </label>

                                {editingPlayer && (
                                    <>
                                        <label>
                                            Payment status
                                            <input value={(editingPlayer.paymentStatus || 'pending').toUpperCase()} disabled readOnly />
                                        </label>

                                        <label>
                                            Payment method
                                            <input
                                                value={
                                                    editingPlayer.offlinePaymentMethod
                                                        ? editingPlayer.offlinePaymentMethod.toUpperCase()
                                                        : editingPlayer.razorpayPaymentId
                                                            ? 'RAZORPAY'
                                                            : 'Not paid'
                                                }
                                                disabled
                                                readOnly
                                            />
                                        </label>
                                    </>
                                )}

                                {error && (
                                    <div className="admin-error admin-field-wide" role="alert">
                                        {error}
                                    </div>
                                )}

                                <div className="admin-modal-actions admin-field-wide">
                                    <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() => setShowPlayerForm(false)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="admin-primary"
                                        disabled={savingPlayer}
                                    >
                                        {savingPlayer
                                            ? 'Saving…'
                                            : editingPlayer
                                                ? 'Save changes'
                                                : 'Add player'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {paymentPlayer && (
                    <div className="admin-modal-backdrop">
                        <section
                            className="admin-player-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="offline-payment-title"
                        >
                            <h2 id="offline-payment-title">Record Offline Payment</h2>

                            <p className="admin-muted">
                                {paymentPlayer.fullName} · Registration fee{' '}
                                <strong>{money(paymentPlayer.feePaise || 70000)}</strong>
                            </p>

                            <form onSubmit={confirmOfflinePayment} className="admin-player-form">
                                <label>
                                    Payment method
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        required
                                    >
                                        <option value="cash">Cash received</option>
                                        <option value="upi">Personal UPI received</option>
                                    </select>
                                </label>

                                {paymentMethod === 'upi' && (
                                    <label>
                                        UPI transaction reference (optional)
                                        <input
                                            value={paymentReference}
                                            onChange={e => setPaymentReference(e.target.value)}
                                            maxLength={100}
                                            placeholder="Enter UPI reference"
                                        />
                                    </label>
                                )}

                                <p className="admin-muted admin-field-wide">
                                    Only confirm after the organizer has actually received the payment.
                                    This records an offline payment; it does not verify the transfer through Razorpay.
                                </p>

                                {error && (
                                    <div className="admin-error admin-field-wide" role="alert">
                                        {error}
                                    </div>
                                )}

                                <div className="admin-modal-actions admin-field-wide">
                                    <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() => setPaymentPlayer(null)}
                                        disabled={savingPayment}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="admin-primary"
                                        disabled={savingPayment}
                                    >
                                        {savingPayment ? 'Recording…' : 'Confirm Payment Received'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                <p className="admin-security-note">
                    Admin-only payment actions record the organizer's confirmation.
                    Keep server credentials private and never mark a payment as received unless it was actually received.
                </p>
            </section>
        </main>
    );
}
