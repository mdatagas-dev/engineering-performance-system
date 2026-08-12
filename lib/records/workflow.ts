import { RoleName, RecordStatus } from "@/app/generated/prisma/enums";

// Alur status PRD: DRAFT → SUBMITTED → REVIEWED → APPROVED → LOCKED.
// Hanya transisi next-step yang valid (lompatan ditolak 400); LOCKED terminal
// (tidak ada transisi keluar — Correction Workflow jadi task terpisah).
// Setiap langkah butuh permission sendiri; DRAFT→SUBMITTED juga boleh oleh
// pemilik record (createdBy) walau tanpa permission record.create (opsional).

export type RecordActor = {
  sub: string;
  role: string;
  permissions: string[];
};

export type Transition = {
  to: RecordStatus;
  permission: string;
  actorField?: "reviewedBy" | "approvedBy" | "lockedBy";
  ownerCanAct?: boolean;
};

export const WORKFLOW_TRANSITIONS: Record<RecordStatus, Transition[]> = {
  DRAFT: [{ to: RecordStatus.SUBMITTED, permission: "record.create", ownerCanAct: true }],
  SUBMITTED: [{ to: RecordStatus.REVIEWED, permission: "record.approve", actorField: "reviewedBy" }],
  REVIEWED: [{ to: RecordStatus.APPROVED, permission: "record.approve", actorField: "approvedBy" }],
  APPROVED: [{ to: RecordStatus.LOCKED, permission: "record.lock", actorField: "lockedBy" }],
  LOCKED: [],
};

export function findTransition(
  from: RecordStatus,
  to: RecordStatus
): Transition | undefined {
  return WORKFLOW_TRANSITIONS[from].find((t) => t.to === to);
}

function canAct(actor: RecordActor, transition: Transition, creatorId: string): boolean {
  if (actor.role === RoleName.SUPER_ADMIN) return true;
  if (actor.permissions.includes(transition.permission)) return true;
  if (transition.ownerCanAct && actor.sub === creatorId) return true;
  return false;
}

export type TransitionDecision =
  | { ok: true; transition: Transition }
  | { ok: false; status: 400 | 403; message: string };

export function decideTransition(params: {
  from: RecordStatus;
  to: RecordStatus;
  actor: RecordActor;
  creatorId: string;
}): TransitionDecision {
  const transition = findTransition(params.from, params.to);
  if (!transition) {
    return {
      ok: false,
      status: 400,
      message: `Transisi tidak valid: ${params.from} → ${params.to}. Alur: DRAFT → SUBMITTED → REVIEWED → APPROVED → LOCKED (hanya langkah berikutnya).`,
    };
  }

  if (!canAct(params.actor, transition, params.creatorId)) {
    return {
      ok: false,
      status: 403,
      message: `Anda tidak memiliki izin untuk transisi ${params.from} → ${params.to}.`,
    };
  }

  return { ok: true, transition };
}
