"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type Slot = {
  number: number;
  level: number;
  pistolado_at: string | null;
  correcao_at: string | null;
  revisao_at: string | null;
  notas_at: string | null;
  deleted_at: string | null;
  last_movement_at: string;
};
type Filter = "all" | "pending" | "correction_pending" | "notes_pending" | "done" | "deleted";
type Action = "add" | "pistolado" | "pending" | "correcao_confirmada" | "correcao_pendente" | "notas_pistolado" | "notas_pending" | "delete" | "restore";
type IconName = "check" | "file" | "correction" | "notes" | "undo" | "trash" | "restore" | "search" | "refresh" | "plus" | "chevron";

const ranges = [
  { start: 100, originalEnd: 180, name: "Nível 1", subtitle: "PROVA AMARELA", color: "yellow" },
  { start: 200, originalEnd: 280, name: "Nível 2", subtitle: "PROVA ROSA", color: "pink" },
  { start: 300, originalEnd: 380, name: "Nível 3", subtitle: "PROVA AZUL", color: "blue" },
] as const;

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
  if (name === "notes") return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === "correction") return <svg {...common}><path d="M4 19h16M6 15l8-8 3 3-8 8H6v-3ZM13 8l2-2a2 2 0 0 1 3 3l-2 2"/></svg>;
  if (name === "chevron") return <svg {...common}><path d="m7 10 5 5 5-5"/></svg>;
  if (name === "undo") return <svg {...common}><path d="M9 14 4 9l5-5M4 9h9a7 7 0 1 1-6.6 9.4"/></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg>;
  if (name === "restore") return <svg {...common}><path d="M4 11a8 8 0 1 1 2.1 6M4 16v-5h5M12 7v5l3 2"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5M5.8 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.2-2"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
}

const timeText = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const isDone = (slot: Slot) => !!slot.pistolado_at && !!slot.notas_at;
const correctionReviewDone = (slot: Slot) => !!slot.correcao_at && !!slot.revisao_at;
const needsCorrectionReview = (slot: Slot) => !slot.notas_at && !correctionReviewDone(slot);

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyNumber, setBusyNumber] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [deletion, setDeletion] = useState<Slot | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [bulkConfirmation, setBulkConfirmation] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [expandedNumbers, setExpandedNumbers] = useState<number[]>([]);
  const [reversal, setReversal] = useState<{ slot: Slot; action: Action; stage: string } | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async (quiet = false) => {
    const sequence = ++refreshSequence.current;
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/checklist", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar os lotes.");
      if (sequence !== refreshSequence.current) return;
      setSlots(result.slots);
      setLastSync(new Date());
      if (quiet) setMessage((old) => old.startsWith("Não foi possível sincronizar") ? "" : old);
    } catch (reason) {
      if (sequence !== refreshSequence.current) return;
      setMessage(quiet ? "Não foi possível sincronizar. Tentaremos novamente." :
        reason instanceof Error ? reason.message : "Falha ao carregar os lotes.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 3000);
    const onFocus = () => void refresh(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!deletion && !bulkConfirmation && !reversal) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busyNumber === null && !bulkBusy) {
        setDeletion(null);
        setBulkConfirmation(false);
        setReversal(null);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [deletion, bulkConfirmation, reversal, busyNumber, bulkBusy]);

  const act = async (action: Action, number: number, level?: number) => {
    if (busyNumber !== null) return false;
    refreshSequence.current += 1;
    setBusyNumber(number);
    setMessage("");
    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, number, ...(action === "add" ? { level } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      await refresh(true);
      const messages: Record<Action, string> = {
        add: `Lote ${number} adicionado.`,
        pistolado: `Provas do lote ${number} confirmadas.`,
        pending: `Provas do lote ${number} voltaram para pendente.`,
        correcao_confirmada: `Corretores e revisores do lote ${number} confirmados.`,
        correcao_pendente: `Corretores e revisores do lote ${number} voltaram para pendente.`,
        notas_pistolado: `Notas do lote ${number} confirmadas. Lote concluído!`,
        notas_pending: `Notas do lote ${number} voltaram para pendente.`,
        delete: `Lote ${number} excluído.`,
        restore: `Lote ${number} restaurado.`,
      };
      setMessage(messages[action]);
      if (action === "add") {
        setShowAdd(false);
        setNewNumber("");
        setFilter("all");
        setQuery("");
      }
      return true;
    } catch (reason) {
      await refresh(true);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusyNumber(null);
    }
  };

  const confirmDeletion = async () => {
    if (!deletion) return;
    if (await act("delete", deletion.number)) setDeletion(null);
  };
  const confirmReversal = async () => {
    if (!reversal) return;
    if (await act(reversal.action, reversal.slot.number)) setReversal(null);
  };

  const confirmBulkDeletion = async () => {
    if (!selectedNumbers.length || bulkBusy || busyNumber !== null) return;
    refreshSequence.current += 1;
    setBulkBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_many", numbers: selectedNumbers }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível excluir os lotes.");
      setBulkConfirmation(false);
      setSelectedNumbers([]);
      await refresh(true);
      setMessage(`${result.deleted} lotes excluídos. Você pode restaurá-los em “Excluídos”.`);
    } catch (reason) {
      await refresh(true);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível excluir os lotes.");
      setBulkConfirmation(false);
      setSelectedNumbers([]);
    } finally {
      setBulkBusy(false);
    }
  };

  const active = slots.filter((slot) => !slot.deleted_at);
  const done = active.filter(isDone).length;
  const pending = active.length - done;
  const deleted = slots.length - active.length;
  const provas = active.filter((slot) => slot.pistolado_at).length;
  const provasFaltando = active.length - provas;
  const notas = active.filter((slot) => slot.notas_at).length;
  const correcaoFaltando = active.filter(needsCorrectionReview).length;
  const notasFaltando = active.length - notas;
  const percent = active.length ? Math.round(done / active.length * 100) : 0;
  const provasPercent = active.length ? Math.round(provas / active.length * 100) : 0;
  const notasPercent = active.length ? Math.round(notas / active.length * 100) : 0;
  const bottleneck = provasFaltando > 0
    ? `provas · faltam ${provasFaltando}`
    : correcaoFaltando > 0 ? `corretores e revisores · faltam ${correcaoFaltando}`
    : notasFaltando > 0 ? `notas · faltam ${notasFaltando}` : "nenhum";
  const selected = ranges[rangeIndex];
  const rangeSlots = useMemo(() => slots.filter((slot) => slot.level === rangeIndex + 1), [slots, rangeIndex]);
  const visible = useMemo(() => rangeSlots.filter((slot) => {
    if (query.trim() && !String(slot.number).includes(query.trim())) return false;
    if (filter === "deleted") return !!slot.deleted_at;
    if (slot.deleted_at) return false;
    if (filter === "pending") return !slot.pistolado_at;
    if (filter === "correction_pending") return needsCorrectionReview(slot);
    if (filter === "notes_pending") return !slot.notas_at;
    if (filter === "done") return isDone(slot);
    return true;
  }), [rangeSlots, filter, query]);
  const selectable = visible.filter((slot) => !slot.deleted_at && !isDone(slot)).map((slot) => slot.number);
  const selectedSet = new Set(selectedNumbers);
  const levelActive = rangeSlots.filter((slot) => !slot.deleted_at);
  const levelPendingProofs = levelActive.filter((slot) => !slot.pistolado_at).length;
  const levelCorrectionPending = levelActive.filter(needsCorrectionReview).length;
  const levelNotesPending = levelActive.filter((slot) => !slot.notas_at).length;
  const levelDone = levelActive.filter(isDone).length;
  const allVisibleSelected = selectable.length > 0 && selectable.every((number) => selectedSet.has(number));
  const toggleSelection = (number: number) => setSelectedNumbers((old) =>
    old.includes(number) ? old.filter((item) => item !== number) : old.length < 100 ? [...old, number] : old);

  const submitAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const number = Number(newNumber);
    if (!/^\d+$/.test(newNumber) || number < 1 || number > 999999) {
      setMessage("Informe um número inteiro de 1 a 999999.");
      return;
    }
    void act("add", number, rangeIndex + 1);
  };

  const renderStage = (slot: Slot, stage: "proofs" | "correction" | "notes") => {
    if (slot.deleted_at) return <span className="stage-muted">—</span>;
    const config = {
      proofs: { at: slot.pistolado_at, name: "provas", ready: true, undoReady: !slot.correcao_at && !slot.revisao_at && !slot.notas_at, confirm: "pistolado" as Action, undo: "pending" as Action, icon: "file" as IconName },
      correction: { at: correctionReviewDone(slot) ? slot.revisao_at : null, name: "corretores e revisores", ready: !!slot.pistolado_at, undoReady: !slot.notas_at, confirm: "correcao_confirmada" as Action, undo: "correcao_pendente" as Action, icon: "correction" as IconName },
      notes: { at: slot.notas_at, name: "notas", ready: correctionReviewDone(slot), undoReady: true, confirm: "notas_pistolado" as Action, undo: "notas_pending" as Action, icon: "notes" as IconName },
    }[stage];
    if (slot.notas_at && !config.at && stage === "correction") {
      return <span className="stage-legacy" title="Notas confirmadas antes da criação desta etapa">Etapa anterior não registrada</span>;
    }
    const disabled = busyNumber !== null || (config.at ? !config.undoReady : !config.ready);
    return <button type="button" className={config.at ? "stage-button completed" : "stage-button"}
      aria-label={`${config.at ? "Desfazer" : "Confirmar"} ${config.name} do lote ${slot.number}`}
      aria-pressed={!!config.at}
      title={config.at ? disabled ? "Desfaça a etapa seguinte primeiro" : `Confirmado em ${timeText(config.at)} · clique para desfazer` : config.ready ? `Confirmar ${config.name}` : "Confirme a etapa anterior primeiro"}
      disabled={disabled}
      onClick={() => config.at ? setReversal({ slot, action: config.undo, stage: config.name }) : void act(config.confirm, slot.number)}>
      <Icon name={config.at ? "check" : config.icon}/><span>{config.at ? stage === "proofs" ? "Provas prontas" : stage === "correction" ? "Equipe confirmada" : "Notas prontas" : stage === "correction" ? "Confirmar equipe" : `Confirmar ${config.name}`}</span>{config.at && <Icon name="undo" size={13}/>}
    </button>;
  };

  return <main className="app-shell">
    <div className="dashboard">
      <header className="app-header">
        <div className="identity"><span className="identity-mark"><Image src="/obmep-favicon.png" width={32} height={32} alt="Símbolo da OBMEP"/></span><div><strong>OBMEP</strong><span>Controle de lotes · 2026</span></div></div>
        <div className="header-right"><span className="live-dot"/> Sincronização automática <span className="sync-time">{lastSync ? `· ${lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>
      </header>

      <section className="intro">
        <div><div className="eyebrow">CONTROLE DE PISTOLAGEM</div><h1>Três confirmações, lote concluído</h1><p>Confirme as provas, corretores e revisores juntos, e depois as notas. O lote concluído fica verde.</p></div>
        <div className="intro-total"><span>Progresso geral</span><strong>{percent}%</strong><small>{done} de {active.length} lotes concluídos</small><div className="progress-track"><div style={{ width: `${percent}%` }}/></div></div>
      </section>

      <section className="live-metrics" aria-label="Progresso em tempo real">
        <span><strong>{active.length}</strong> lotes</span>
        <span><strong>{provas}</strong> provas pistoladas <b>{provasPercent}%</b></span>
        <span><strong>{notas}</strong> notas pistoladas <b>{notasPercent}%</b></span>
        <span>Gargalo: <strong>{bottleneck}</strong></span>
        <small><span className="live-dot"/> atualiza a cada 3 s</small>
      </section>

      <section className="summary" aria-label="Resumo dos lotes">
        <div className="summary-item"><span>LOTES ATIVOS</span><strong>{active.length}</strong><small>nos três níveis</small></div>
        <div className="summary-item"><span>PROVAS CONFIRMADAS</span><strong className="amber-text">{provas}</strong><small>primeira etapa</small></div>
        <div className="summary-item missing-item"><span>FALTAM PISTOLAR PROVAS</span><strong className="missing-text">{provasFaltando}</strong><small>{active.length ? Math.round(provasFaltando / active.length * 100) : 0}% dos lotes ativos</small></div>
        <div className="summary-item"><span>NOTAS CONFIRMADAS</span><strong className="blue-text">{notas}</strong><small>etapa final</small></div>
        <div className="summary-item"><span>CONCLUÍDOS</span><strong className="green-text">{done}</strong><small>{pending} pendentes · {deleted} excluídos</small></div>
      </section>

      <section className="board" data-level={selected.color} aria-label="Checklist de lotes">
        <div className="board-top"><div className="board-heading"><span className="board-dot"/><strong>Lotes · {selected.name}</strong><span className="board-count">{levelActive.length} ativos</span></div><div className="legend"><span><i className="legend-pending"/> pendente</span><span><i className="legend-progress"/> em andamento</span><span><i className="legend-done"/> concluído</span></div></div>

        <div className="level-cards" role="tablist" aria-label="Níveis de prova">
          {ranges.map((range, index) => {
            const group = slots.filter((slot) => slot.level === index + 1 && !slot.deleted_at);
            const groupDone = group.filter(isDone).length;
            const groupProvas = group.filter((slot) => slot.pistolado_at).length;
            const groupCorrectionPending = group.filter(needsCorrectionReview).length;
            const groupNotas = group.filter((slot) => slot.notas_at).length;
            const groupProvasPercent = group.length ? Math.round(groupProvas / group.length * 100) : 0;
            const groupNotasPercent = group.length ? Math.round(groupNotas / group.length * 100) : 0;
            return <button type="button" role="tab" aria-selected={rangeIndex === index} data-level={range.color} className={rangeIndex === index ? "level-card selected" : "level-card"} key={range.start} onClick={() => { setRangeIndex(index); setSelectedNumbers([]); }}>
              <span className="level-card-top"><strong>{range.name} <small>{range.subtitle}</small></strong><em>{group.length} lotes ativos</em></span>
              <span className="level-card-missing">Faltam pistolar provas: <strong>{group.length - groupProvas}</strong></span>
              <span className="level-card-stages">Corretores e revisores pendentes: <b>{groupCorrectionPending}</b></span>
              <span className="level-card-progress"><span style={{ width: `${group.length ? groupDone / group.length * 100 : 0}%` }}/></span>
              <span className="level-card-stats"><span><Icon name="file" size={13}/> {groupProvas} provas <b>{groupProvasPercent}%</b></span><span><Icon name="notes" size={13}/> {groupNotas} notas <b>{groupNotasPercent}%</b></span><span className="level-card-complete"><Icon name="check" size={13}/> {groupDone} concluídos</span></span>
            </button>;
          })}
        </div>

        <div className="toolbar"><label className="search"><Icon name="search" size={16}/><input aria-label="Buscar lote" inputMode="numeric" placeholder="Buscar número do lote..." value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="filters" role="group" aria-label="Filtrar situação"><button className={filter === "all" ? "active" : ""} onClick={() => { setFilter("all"); setQuery(""); }}>Todos ({levelActive.length})</button><button className={filter === "pending" ? "active" : ""} onClick={() => { setFilter("pending"); setQuery(""); }}>Faltam provas ({levelPendingProofs})</button><button className={filter === "correction_pending" ? "active" : ""} onClick={() => { setFilter("correction_pending"); setQuery(""); }}>Faltam corretores/revisores ({levelCorrectionPending})</button><button className={filter === "notes_pending" ? "active" : ""} onClick={() => { setFilter("notes_pending"); setQuery(""); }}>Faltam notas ({levelNotesPending})</button><button className={filter === "done" ? "active" : ""} onClick={() => { setFilter("done"); setQuery(""); }}>Concluídos ({levelDone})</button><button className={filter === "deleted" ? "active" : ""} onClick={() => { setFilter("deleted"); setQuery(""); }}>Excluídos ({rangeSlots.length - levelActive.length})</button></div><button className="refresh-button" title="Atualizar agora" aria-label="Atualizar agora" onClick={() => void refresh()}><Icon name="refresh" size={16}/></button><button className="add-button" type="button" aria-expanded={showAdd} onClick={() => { setShowAdd((old) => !old); setNewNumber(""); }}><Icon name="plus" size={16}/> Adicionar lote</button></div>

        <div className="bulk-toolbar"><span>{selectedNumbers.length ? `${selectedNumbers.length} selecionado${selectedNumbers.length === 1 ? "" : "s"}` : "Selecione os lotes para excluir vários"}</span><button type="button" disabled={!selectable.length || bulkBusy || busyNumber !== null} onClick={() => { if (allVisibleSelected) setSelectedNumbers((old) => old.filter((number) => !selectable.includes(number))); else setSelectedNumbers((old) => [...new Set([...old, ...selectable])].slice(0, 100)); }}>{allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}</button>{selectedNumbers.length > 0 && <button type="button" onClick={() => setSelectedNumbers([])}>Limpar</button>}<button type="button" className="bulk-delete" disabled={!selectedNumbers.length || bulkBusy || busyNumber !== null} onClick={() => setBulkConfirmation(true)}><Icon name="trash" size={14}/> Excluir selecionados ({selectedNumbers.length})</button></div>

        {showAdd && <form className="add-form" onSubmit={submitAdd}><div><strong>Novo lote · {selected.name}</strong><span>Informe qualquer número ainda não cadastrado. Os lotes atuais permanecem como estão.</span></div><label><span>Nível</span><select value={rangeIndex + 1} onChange={(event) => setRangeIndex(Number(event.target.value) - 1)}><option value={1}>Nível 1 · amarelo</option><option value={2}>Nível 2 · rosa</option><option value={3}>Nível 3 · azul</option></select></label><label><span>Número do lote</span><input autoFocus type="number" inputMode="numeric" min={1} max={999999} value={newNumber} onChange={(event) => setNewNumber(event.target.value)} placeholder="Ex.: 401" required/></label><button type="submit" disabled={busyNumber !== null}><Icon name="plus" size={15}/> Adicionar</button></form>}

        {message && <div className="notice" role="status"><span>{message}</span><button aria-label="Fechar aviso" onClick={() => setMessage("")}>×</button></div>}

        <div className="table-wrap"><table><thead><tr><th className="select-cell"><input type="checkbox" aria-label="Selecionar todos os lotes visíveis que podem ser excluídos" checked={allVisibleSelected} disabled={!selectable.length || bulkBusy || busyNumber !== null} onChange={() => { if (allVisibleSelected) setSelectedNumbers((old) => old.filter((number) => !selectable.includes(number))); else setSelectedNumbers((old) => [...new Set([...old, ...selectable])].slice(0, 100)); }}/></th><th>LOTE</th><th>SITUAÇÃO</th><th>1 · PROVAS</th><th>2 · CORRETORES E REVISORES</th><th>3 · NOTAS</th><th>ÚLTIMA MOV.</th><th>AÇÃO</th></tr></thead><tbody>
          {visible.map((slot) => <tr key={slot.number} data-expanded={expandedNumbers.includes(slot.number)} className={slot.deleted_at ? "deleted-row" : isDone(slot) ? "complete-row" : ""}>
            <td className="select-cell" data-label="Selecionar">{!slot.deleted_at && !isDone(slot) && <input type="checkbox" aria-label={`Selecionar lote ${slot.number} para exclusão`} checked={selectedSet.has(slot.number)} disabled={bulkBusy || busyNumber !== null || (!selectedSet.has(slot.number) && selectedNumbers.length >= 100)} onChange={() => toggleSelection(slot.number)}/>}</td>
            <td className="lot-cell" data-label="Lote"><span className="lot-number lot-number-desktop">{slot.number}</span><button type="button" className="mobile-lot-toggle" aria-expanded={expandedNumbers.includes(slot.number)} aria-label={`${expandedNumbers.includes(slot.number) ? "Fechar" : "Abrir"} etapas do lote ${slot.number}`} onClick={() => setExpandedNumbers((old) => old.includes(slot.number) ? old.filter((item) => item !== slot.number) : [...old, slot.number])}><strong>Lote {slot.number}</strong><span>{expandedNumbers.includes(slot.number) ? "Fechar" : "Abrir etapas"}</span><Icon name="chevron" size={18}/></button></td>
            <td className="status-cell" data-label="Situação">{slot.deleted_at ? <span className="status-badge deleted">Excluído</span> : isDone(slot) ? <span className="status-badge done"><Icon name="check" size={13}/> Concluído</span> : !slot.pistolado_at ? <span className="status-badge pending">Faltam provas</span> : !correctionReviewDone(slot) ? <span className="status-badge progress">Faltam corretores/revisores</span> : <span className="status-badge progress">Faltam notas</span>}</td>
            <td data-label="1 · Provas">{renderStage(slot, "proofs")}</td>
            <td data-label="2 · Corretores/revisores">{renderStage(slot, "correction")}</td>
            <td data-label="3 · Notas">{renderStage(slot, "notes")}</td>
            <td className="muted" data-label="Última mov.">{timeText(slot.last_movement_at)}</td>
            <td data-label="Ação">{slot.deleted_at ? <button className="row-action restore" aria-label={`Restaurar lote ${slot.number}`} disabled={busyNumber !== null} onClick={() => void act("restore", slot.number)}><Icon name="restore" size={14}/> Restaurar</button> : !isDone(slot) ? <button className="row-action delete" aria-label={`Excluir lote ${slot.number}`} disabled={busyNumber !== null} onClick={() => setDeletion(slot)}><Icon name="trash" size={14}/> Excluir</button> : null}</td>
          </tr>)}
        </tbody></table></div>
        {loading && !slots.length && <div className="empty">Carregando lotes...</div>}
        {!loading && !visible.length && <div className="empty">{filter === "deleted" ? "Nenhum lote excluído neste nível." : filter === "pending" ? "Nenhuma prova pendente neste nível." : filter === "correction_pending" ? "Nenhum corretor ou revisor pendente neste nível." : filter === "notes_pending" ? "Nenhuma nota pendente neste nível." : "Nenhum lote encontrado neste filtro."}</div>}
        <div className="board-footer"><span>Mostrando {visible.length} lote{visible.length === 1 ? "" : "s"} · {selected.name}</span><span>Atualização a cada 3 segundos</span></div>
      </section>
      {deletion && <div className="modal-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <div className="dialog-icon"><Icon name="trash" size={22}/></div>
        <h2 id="delete-title">Excluir lote {deletion.number}?</h2>
        <p id="delete-description">O lote sairá da lista ativa e poderá ser restaurado em “Excluídos”. {deletion.pistolado_at ? "A confirmação das provas será preservada." : "Nenhuma confirmação será alterada."}</p>
        <div className="dialog-actions"><button type="button" className="dialog-cancel" autoFocus disabled={busyNumber !== null} onClick={() => setDeletion(null)}>Cancelar</button><button type="button" className="dialog-delete" disabled={busyNumber !== null} onClick={() => void confirmDeletion()}><Icon name="trash" size={15}/> {busyNumber === deletion.number ? "Excluindo..." : "Excluir lote"}</button></div>
      </div></div>}
      {bulkConfirmation && <div className="modal-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title" aria-describedby="bulk-delete-description">
        <div className="dialog-icon"><Icon name="trash" size={22}/></div>
        <h2 id="bulk-delete-title">Excluir {selectedNumbers.length} lotes?</h2>
        <p id="bulk-delete-description">Lotes {selectedNumbers.slice().sort((a, b) => a - b).slice(0, 12).join(", ")}{selectedNumbers.length > 12 ? ` e mais ${selectedNumbers.length - 12}` : ""}. Eles sairão da lista ativa e poderão ser restaurados em “Excluídos”. As confirmações já feitas serão preservadas.</p>
        <div className="dialog-actions"><button type="button" className="dialog-cancel" autoFocus disabled={bulkBusy} onClick={() => setBulkConfirmation(false)}>Cancelar</button><button type="button" className="dialog-delete" disabled={bulkBusy} onClick={() => void confirmBulkDeletion()}><Icon name="trash" size={15}/> {bulkBusy ? "Excluindo..." : `Excluir ${selectedNumbers.length} lotes`}</button></div>
      </div></div>}
      {reversal && <div className="modal-backdrop" role="presentation"><div className="delete-dialog reversal-dialog" role="dialog" aria-modal="true" aria-labelledby="reversal-title" aria-describedby="reversal-description">
        <div className="dialog-icon"><Icon name="undo" size={22}/></div>
        <h2 id="reversal-title">Desfazer {reversal.stage} do lote {reversal.slot.number}?</h2>
        <p id="reversal-description">Esta confirmação voltará a ficar pendente e a contagem será atualizada para todos que usam o painel.</p>
        <div className="dialog-actions"><button type="button" className="dialog-cancel" autoFocus disabled={busyNumber !== null} onClick={() => setReversal(null)}>Cancelar</button><button type="button" className="dialog-delete" disabled={busyNumber !== null} onClick={() => void confirmReversal()}><Icon name="undo" size={15}/> {busyNumber === reversal.slot.number ? "Desfazendo..." : "Desfazer confirmação"}</button></div>
      </div></div>}
      <footer className="page-footer">OBMEP · Controle de pistolagem · 2026</footer>
    </div>
  </main>;
}
