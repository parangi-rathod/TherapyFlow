import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseMedical,
  Crown,
  ShieldCheck,
  Users,
} from "lucide-react";

import { StaffMemberForm } from "@/components/staff/staff-member-form";
import { StaffMemberRemoveButton } from "@/components/staff/staff-member-remove-button";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Staff | TherapyFlow",
};

type PracticeRow = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  practice_type: string;
  timezone: string;
  billing_email: string | null;
};

type PracticeMemberRow = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "therapist" | "billing";
  status: "invited" | "active" | "disabled";
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type StaffRosterRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "therapist" | "billing";
  status: "invited" | "active" | "disabled";
  invitedAt: string | null;
  acceptedAt: string | null;
};

function formatFriendly(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

async function getPageData() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    return {
      practice: null,
      practiceDetails: null,
      members: [] as StaffRosterRow[],
      currentUserId: user.id,
    };
  }

  const { data: practiceDetails, error: practiceError } = await supabase
    .from("practices")
    .select("id, name, slug, owner_user_id, practice_type, timezone, billing_email")
    .eq("id", practice.id)
    .maybeSingle<PracticeRow>();

  if (practiceError || !practiceDetails) {
    throw practiceError ?? new Error("Practice details could not be loaded.");
  }

  const { data: members, error: membersError } = await supabase
    .from("practice_members")
    .select("id, user_id, role, status, invited_at, accepted_at, created_at")
    .eq("practice_id", practice.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw membersError;
  }

  const adminSupabase = createAdminSupabaseClient();
  const rosterMembers = (members ?? []) as PracticeMemberRow[];
  const userIds = Array.from(
    new Set([practiceDetails.owner_user_id, ...rosterMembers.map((member) => member.user_id)]),
  );
  const { data: profiles, error: profilesError } = await adminSupabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      {
        name: profile.full_name?.trim() || profile.email?.trim() || "Unknown user",
        email: profile.email?.trim() || "No email on file",
      },
    ]),
  );

  const ownerProfile = profileMap.get(practiceDetails.owner_user_id);
  const staffRoster: StaffRosterRow[] = [
    {
      id: `owner-${practiceDetails.id}`,
      userId: practiceDetails.owner_user_id,
      name: ownerProfile?.name || "Practice owner",
      email: ownerProfile?.email || "No email on file",
      role: "owner",
      status: "active",
      invitedAt: null,
      acceptedAt: null,
    },
    ...rosterMembers
      .filter((member) => member.user_id !== practiceDetails.owner_user_id)
      .map((member) => {
        const profile = profileMap.get(member.user_id);

        return {
          id: member.id,
          userId: member.user_id,
          name: profile?.name || "Unknown user",
          email: profile?.email || "No email on file",
          role: member.role,
          status: member.status,
          invitedAt: member.invited_at,
          acceptedAt: member.accepted_at,
        };
      }),
  ];

  return {
    practice,
    practiceDetails,
    members: staffRoster,
    currentUserId: user.id,
  };
}

function SummaryCards({
  practice,
  members,
}: {
  practice: PracticeContext;
  members: StaffRosterRow[];
}) {
  const activeMembers = members.filter((member) => member.status === "active");
  const invitedMembers = members.filter((member) => member.status === "invited");
  const admins = members.filter(
    (member) => member.role === "owner" || member.role === "admin",
  );

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.8rem] border border-emerald-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(10,91,72,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Practice</p>
          <BriefcaseMedical className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your role: {practice.role}</p>
      </article>
      <article className="rounded-[1.8rem] border border-sky-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Active staff</p>
          <Users className="h-5 w-5 text-sky-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">{activeMembers.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Invited staff: {invitedMembers.length}
        </p>
      </article>
      <article className="rounded-[1.8rem] border border-teal-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(13,148,136,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Admin coverage</p>
          <ShieldCheck className="h-5 w-5 text-teal-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">{admins.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner and admin roles with roster control
        </p>
      </article>
    </section>
  );
}

export default async function StaffPage() {
  const { practice, practiceDetails, members, currentUserId } = await getPageData();

  if (!practice || !practiceDetails) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before managing staff
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Role-based staff management depends on an existing practice workspace.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open dashboard setup
          </Link>
        </section>
      </main>
    );
  }

  if (practice.role !== "owner" && practice.role !== "admin") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Admin access required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Only owners and admins can manage staff
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Your current role is {practice.role}. Ask a practice owner or admin to
            manage the staff roster or change your access.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-teal-200/70 bg-[radial-gradient(circle_at_top_left,rgba(153,246,228,0.8),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.96))] p-8 shadow-[0_30px_80px_rgba(13,148,136,0.12)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-teal-800/70">
              Practice administration
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Staff management
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Manage the care team inside {practice.name}, assign role-based access,
              and keep the roster aligned with real clinic operations instead of a generic admin list.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-teal-200 bg-white/85 px-4 py-2">
                Role-based access
              </span>
              <span className="rounded-full border border-sky-200 bg-white/85 px-4 py-2">
                Existing-user onboarding
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/85 px-4 py-2">
                Practice roster control
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.9rem] border border-sky-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(14,116,144,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
            Practice profile
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            {practiceDetails.name}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-medium text-slate-900">Workspace slug</p>
              <p className="mt-2">{practiceDetails.slug}</p>
            </div>
            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-medium text-slate-900">Timezone</p>
              <p className="mt-2">{practiceDetails.timezone}</p>
            </div>
          </div>
        </article>
        <article className="rounded-[1.9rem] border border-amber-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(217,119,6,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-800/70">
            Staff onboarding note
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Staff can only be added after they already have a TherapyFlow account.
            Use their signup email here, then mark them `invited` or `active`
            based on how you want the roster reflected right now.
          </p>
        </article>
      </section>

      <SummaryCards practice={practice} members={members} />

      <section className="rounded-[2rem] border border-teal-200/70 bg-white/92 p-8 shadow-[0_24px_70px_rgba(13,148,136,0.08)]">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-800/70">
            Add staff member
          </p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Expand the practice roster
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Add existing platform users to the practice and assign the exact access they need.
          </p>
        </div>
        <div className="mt-6">
          <StaffMemberForm
            mode="create"
            initialValues={{
              email: "",
              role: "therapist",
              status: "invited",
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Current staff roster
          </p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Review and manage access
          </h2>
        </div>

        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isCurrentUser = member.userId === currentUserId;

          return (
            <article
              key={member.id}
              className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-950">{member.name}</h3>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-800">
                      {titleCase(member.role)}
                    </span>
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-teal-800">
                      {titleCase(member.status)}
                    </span>
                    {isOwner ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-800">
                        Owner
                      </span>
                    ) : null}
                    {isCurrentUser ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-700">
                        You
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">{member.email}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {member.invitedAt ? (
                      <span>Invited: {formatFriendly(member.invitedAt)}</span>
                    ) : null}
                    {member.acceptedAt ? (
                      <span>Accepted: {formatFriendly(member.acceptedAt)}</span>
                    ) : null}
                  </div>
                </div>

                {isOwner ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                    <Crown className="h-4 w-4" />
                    Owner access
                  </div>
                ) : (
                  <StaffMemberRemoveButton
                    membershipId={member.id}
                    memberLabel={member.name}
                    disabled={isCurrentUser}
                  />
                )}
              </div>

              {!isOwner ? (
                <div className="mt-6">
                  <StaffMemberForm
                    mode="edit"
                    initialValues={{
                      membershipId: member.id,
                      email: member.email,
                      role: member.role as "admin" | "therapist" | "billing",
                      status: member.status,
                    }}
                    disableStatusChange={false}
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
