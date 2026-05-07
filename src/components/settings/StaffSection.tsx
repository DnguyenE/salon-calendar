"use client";

import { useEffect, useMemo, useState } from "react";
import type { Technician } from "@/src/types";
import { useStaff } from "@/src/store/useStaff";
import { useServices } from "@/src/store/useServices";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { SettingsSection } from "./SettingsSection";

interface StaffSectionProps {
  emailDomain?: string | null;
}

function slugifyNamePart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");
}

function buildPrefillEmail(
  firstName: string,
  lastName: string,
  emailDomain?: string | null,
): string {
  const domain = (emailDomain ?? "").trim().toLowerCase();
  if (!domain) return "";
  const first = slugifyNamePart(firstName);
  const last = slugifyNamePart(lastName);
  if (!first || !last) return "";
  return `${first}.${last}@${domain}`;
}

export function StaffSection({ emailDomain = null }: StaffSectionProps) {
  const technicians = useStaff((s) => s.technicians);
  const hydrated = useStaff((s) => s.hydrated);
  const error = useStaff((s) => s.error);
  const hydrate = useStaff((s) => s.hydrate);
  const addTechnician = useStaff((s) => s.addTechnician);
  const updateTechnician = useStaff((s) => s.updateTechnician);
  const removeTechnician = useStaff((s) => s.removeTechnician);
  const setTechnicianServices = useStaff((s) => s.setTechnicianServices);

  const services = useServices((s) => s.services);
  const hydrateServices = useServices((s) => s.hydrate);

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Technician | null>(null);

  useEffect(() => {
    void hydrate();
    void hydrateServices();
  }, [hydrate, hydrateServices]);

  function handleRemoveRequest(t: Technician) {
    setRemoving(t);
  }

  function handleConfirmRemove() {
    if (!removing) return;
    void removeTechnician(removing.id);
    setRemoving(null);
  }

  return (
    <SettingsSection
      title="Staff"
      description="Manage technicians and the services each one offers."
    >
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {!hydrated ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {technicians.map((t) => (
            <StaffRow
              key={t.id}
              technician={t}
              services={services}
              onSave={(input) => updateTechnician({ id: t.id, ...input })}
              onRemove={() => handleRemoveRequest(t)}
              onSaveServices={(next) => setTechnicianServices(t.id, next)}
            />
          ))}

          {technicians.length === 0 && !adding && (
            <p className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No staff yet. Add your first technician below.
            </p>
          )}

          {adding && (
            <NewStaffRow
              emailDomain={emailDomain}
              onCancel={() => setAdding(false)}
              onSubmit={async (input) => {
                const res = await addTechnician(input);
                if (res.ok) setAdding(false);
                return res;
              }}
            />
          )}

          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <span aria-hidden className="text-sm leading-none">+</span>
              Add staff
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        title={
          removing
            ? `Remove ${[removing.firstName, removing.lastName].filter(Boolean).join(" ") || "staff member"}?`
            : "Remove staff?"
        }
        description="This will remove the staff member and their account access."
        confirmLabel="Remove"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
      />
    </SettingsSection>
  );
}

interface StaffRowProps {
  technician: Technician;
  services: { id: string; name: string }[];
  onSave: (input: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => void;
  onSaveServices: (serviceIds: string[]) => Promise<{ ok: boolean; error?: string }>;
}

function StaffRow({
  technician,
  services,
  onSave,
  onRemove,
  onSaveServices,
}: StaffRowProps) {
  const [draft, setDraft] = useState({
    firstName: technician.firstName,
    lastName: technician.lastName ?? "",
    email: technician.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [draftServiceIds, setDraftServiceIds] = useState<string[]>(
    technician.serviceIds,
  );

  const dirty =
    draft.firstName !== technician.firstName ||
    draft.lastName !== (technician.lastName ?? "") ||
    draft.email !== (technician.email ?? "");

  const offered = useMemo(
    () => new Set(technician.serviceIds),
    [technician.serviceIds],
  );
  const draftOffered = useMemo(() => new Set(draftServiceIds), [draftServiceIds]);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const res = await onSave(draft);
    setSaving(false);
    setRowError(res.ok ? null : (res.error ?? "Failed to save."));
  };

  const cancel = () =>
    setDraft({
      firstName: technician.firstName,
      lastName: technician.lastName ?? "",
      email: technician.email ?? "",
    });

  const onKey = (e: React.KeyboardEvent) => {
    if (!dirty) return;
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const selectedServiceNames = services
    .filter((s) => offered.has(s.id))
    .map((s) => s.name);

  const saveServices = async () => {
    if (savingServices) return;
    setSavingServices(true);
    const res = await onSaveServices(draftServiceIds);
    setSavingServices(false);
    if (!res.ok) {
      setRowError(res.error ?? "Failed to save services.");
      return;
    }
    setRowError(null);
    setServicesOpen(false);
  };

  const toggleDraftService = (serviceId: string, checked: boolean) => {
    setDraftServiceIds((prev) =>
      checked
        ? Array.from(new Set([...prev, serviceId]))
        : prev.filter((id) => id !== serviceId),
    );
  };

  return (
    <div
      className={`rounded-md border bg-zinc-50/50 p-2 transition-colors dark:bg-zinc-800/40 ${
        dirty
          ? "border-zinc-400 dark:border-zinc-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft.firstName}
          onChange={(e) =>
            setDraft((d) => ({ ...d, firstName: e.target.value }))
          }
          onKeyDown={onKey}
          aria-label="First name"
          placeholder="First name"
          className="min-w-0 flex-1 basis-28 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <input
          type="text"
          value={draft.lastName}
          onChange={(e) =>
            setDraft((d) => ({ ...d, lastName: e.target.value }))
          }
          onKeyDown={onKey}
          aria-label="Last name"
          placeholder="Last name"
          className="min-w-0 flex-1 basis-28 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <input
          type="email"
          value={draft.email}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          onKeyDown={onKey}
          aria-label="Email"
          placeholder="email@example.com"
          className="min-w-0 flex-1 basis-48 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />

        {dirty ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              title="Save (Enter)"
              className="h-8 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              title="Cancel (Esc)"
              className="h-8 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${technician.firstName}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-900 dark:hover:bg-rose-950 dark:hover:text-rose-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        )}
      </div>

      {rowError && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {rowError}
        </p>
      )}

      <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Services offered
          </p>
          <button
            type="button"
            onClick={() => {
              setDraftServiceIds(technician.serviceIds);
              setServicesOpen(true);
            }}
            disabled={services.length === 0}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Edit services
          </button>
        </div>
        {services.length === 0 ? (
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Add services first to assign them to staff.
          </p>
        ) : selectedServiceNames.length === 0 ? (
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            No services assigned.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            {selectedServiceNames.join(", ")}
          </p>
        )}
      </div>

      {servicesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (savingServices) return;
            setServicesOpen(false);
            setDraftServiceIds(technician.serviceIds);
          }}
        >
          <div
            className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Edit services for {technician.firstName}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Select all services this technician offers.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {services.map((s) => {
                const checked = draftOffered.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      checked
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleDraftService(s.id, e.target.checked)}
                      className="sr-only"
                    />
                    <span className="leading-tight">{s.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setServicesOpen(false);
                  setDraftServiceIds(technician.serviceIds);
                }}
                disabled={savingServices}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveServices()}
                disabled={savingServices}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Save services
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NewStaffRowProps {
  emailDomain?: string | null;
  onCancel: () => void;
  onSubmit: (input: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

function NewStaffRow({ emailDomain, onCancel, onSubmit }: NewStaffRowProps) {
  const [draft, setDraft] = useState({ firstName: "", lastName: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailCustomized, setEmailCustomized] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    const res = await onSubmit(draft);
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Failed to add staff.");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="rounded-md border border-zinc-400 bg-zinc-50/50 p-2 dark:border-zinc-500 dark:bg-zinc-800/40">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          type="text"
          value={draft.firstName}
          onChange={(e) => {
            const firstName = e.target.value;
            setDraft((d) => ({
              ...d,
              firstName,
              email: emailCustomized
                ? d.email
                : buildPrefillEmail(firstName, d.lastName, emailDomain),
            }));
          }}
          onKeyDown={onKey}
          aria-label="First name"
          placeholder="First name"
          className="min-w-0 flex-1 basis-28 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <input
          type="text"
          value={draft.lastName}
          onChange={(e) => {
            const lastName = e.target.value;
            setDraft((d) => ({
              ...d,
              lastName,
              email: emailCustomized
                ? d.email
                : buildPrefillEmail(d.firstName, lastName, emailDomain),
            }));
          }}
          onKeyDown={onKey}
          aria-label="Last name"
          placeholder="Last name"
          className="min-w-0 flex-1 basis-28 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <input
          type="email"
          value={draft.email}
          onChange={(e) => {
            setEmailCustomized(true);
            setDraft((d) => ({ ...d, email: e.target.value }));
          }}
          onKeyDown={onKey}
          aria-label="Email"
          placeholder="email@example.com"
          className="min-w-0 flex-1 basis-48 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="h-8 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
