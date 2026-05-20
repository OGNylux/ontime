-- Test data seed: March, April, May 2026
-- Run this in the Supabase SQL editor while logged in as your user.
-- It auto-detects your user ID and active workspace.

DO $$
DECLARE
  v_user_id      uuid;
  v_workspace_id uuid;

  -- Clients
  c_acme   uuid := gen_random_uuid();
  c_nova   uuid := gen_random_uuid();

  -- Projects
  p_web    uuid := gen_random_uuid();
  p_mobile uuid := gen_random_uuid();
  p_consult uuid := gen_random_uuid();

  -- Tasks
  t_design   uuid := gen_random_uuid();
  t_frontend uuid := gen_random_uuid();
  t_backend  uuid := gen_random_uuid();
  t_ui       uuid := gen_random_uuid();
  t_api      uuid := gen_random_uuid();
  t_meeting  uuid := gen_random_uuid();
  t_research uuid := gen_random_uuid();
  t_review   uuid := gen_random_uuid();

BEGIN
  -- Resolve user and active workspace from ontime_user (works in SQL editor / service role)
  SELECT id, active_workspace_id INTO v_user_id, v_workspace_id
  FROM public.ontime_user
  WHERE active_workspace_id IS NOT NULL
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user with an active workspace found in ontime_user.';
  END IF;

  -- ── Cleanup previous seed run ────────────────────────────────────────────────
  DELETE FROM public.ontime_calendar_entry
  WHERE task_id IN (
    SELECT t.id FROM public.ontime_task t
    JOIN public.ontime_project p ON p.id = t.project_id
    WHERE p.workspace_id = v_workspace_id
      AND p.name IN ('Website Redesign', 'Mobile App', 'Client Consulting')
  );
  DELETE FROM public.ontime_task
  WHERE project_id IN (
    SELECT id FROM public.ontime_project
    WHERE workspace_id = v_workspace_id
      AND name IN ('Website Redesign', 'Mobile App', 'Client Consulting')
  );
  DELETE FROM public.ontime_project
  WHERE workspace_id = v_workspace_id
    AND name IN ('Website Redesign', 'Mobile App', 'Client Consulting');
  DELETE FROM public.ontime_client
  WHERE workspace_id = v_workspace_id
    AND name IN ('Acme Corp', 'Nova Studios');

  -- ── Clients ───────────────────────────────────────────────────────────────────
  INSERT INTO public.ontime_client (id, workspace_id, created_by, name, pinned)
  VALUES
    (c_acme, v_workspace_id, v_user_id, 'Acme Corp',    false),
    (c_nova, v_workspace_id, v_user_id, 'Nova Studios', false);

  -- ── Projects ─────────────────────────────────────────────────────────────────
  INSERT INTO public.ontime_project (id, workspace_id, created_by, client_id, name, color, hourly_rate, pinned)
  VALUES
    (p_web,     v_workspace_id, v_user_id, c_acme, 'Website Redesign',  2,  85.00, false),
    (p_mobile,  v_workspace_id, v_user_id, c_nova, 'Mobile App',        5,  95.00, false),
    (p_consult, v_workspace_id, v_user_id, c_acme, 'Client Consulting', 8, 120.00, false);

  -- ── Tasks ─────────────────────────────────────────────────────────────────────
  INSERT INTO public.ontime_task (id, workspace_id, created_by, project_id, name, color, pinned)
  VALUES
    -- Website Redesign (blues/purples)
    (t_design,   v_workspace_id, v_user_id, p_web,     'Design & Wireframing', 3,  false),
    (t_frontend, v_workspace_id, v_user_id, p_web,     'Frontend Development', 2,  false),
    (t_backend,  v_workspace_id, v_user_id, p_web,     'Backend Integration',  1,  false),
    -- Mobile App (greens)
    (t_ui,       v_workspace_id, v_user_id, p_mobile,  'UI Components',        5,  false),
    (t_api,      v_workspace_id, v_user_id, p_mobile,  'API Integration',      6,  false),
    -- Client Consulting (warm tones)
    (t_meeting,  v_workspace_id, v_user_id, p_consult, 'Client Meetings',      8,  false),
    (t_research, v_workspace_id, v_user_id, p_consult, 'Research & Analysis',  9,  false),
    (t_review,   v_workspace_id, v_user_id, p_consult, 'Code Reviews',         10, false);

  -- ── Calendar entries ──────────────────────────────────────────────────────────
  -- Helper macro: each row is (date TEXT, start_hour INT, duration_hours NUMERIC, task_id uuid, billable BOOL)
  INSERT INTO public.ontime_calendar_entry
    (id, workspace_id, created_by, task_id, start_time, end_time, is_billable)
  VALUES
    -- ── MARCH ────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-03-02 09:00:00+00', '2026-03-02 12:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-03-02 13:00:00+00', '2026-03-02 14:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-03-03 09:00:00+00', '2026-03-03 11:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-03 11:30:00+00', '2026-03-03 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-03-04 10:00:00+00', '2026-03-04 12:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-05 09:00:00+00', '2026-03-05 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-05 14:00:00+00', '2026-03-05 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-03-06 09:30:00+00', '2026-03-06 15:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-03-09 09:00:00+00', '2026-03-09 10:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-09 11:00:00+00', '2026-03-09 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-03-10 09:00:00+00', '2026-03-10 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-10 14:00:00+00', '2026-03-10 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-03-11 10:00:00+00', '2026-03-11 13:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-03-11 14:00:00+00', '2026-03-11 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-03-12 09:00:00+00', '2026-03-12 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-03-12 15:00:00+00', '2026-03-12 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-13 09:00:00+00', '2026-03-13 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-03-16 10:00:00+00', '2026-03-16 11:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-03-16 13:00:00+00', '2026-03-16 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-17 09:00:00+00', '2026-03-17 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-03-17 14:00:00+00', '2026-03-17 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-03-18 09:30:00+00', '2026-03-18 12:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-03-19 09:00:00+00', '2026-03-19 15:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-19 16:00:00+00', '2026-03-19 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-20 09:00:00+00', '2026-03-20 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-03-23 09:00:00+00', '2026-03-23 11:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-03-23 13:00:00+00', '2026-03-23 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-24 09:00:00+00', '2026-03-24 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-03-25 10:00:00+00', '2026-03-25 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-25 15:00:00+00', '2026-03-25 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-03-26 09:30:00+00', '2026-03-26 12:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-03-27 09:00:00+00', '2026-03-27 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-03-30 09:00:00+00', '2026-03-30 12:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-03-30 13:00:00+00', '2026-03-30 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-03-31 09:00:00+00', '2026-03-31 15:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-03-31 16:00:00+00', '2026-03-31 17:00:00+00', true),

    -- ── APRIL ────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-01 09:00:00+00', '2026-04-01 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-04-01 14:00:00+00', '2026-04-01 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-04-02 10:00:00+00', '2026-04-02 11:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-04-02 13:00:00+00', '2026-04-02 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-03 09:00:00+00', '2026-04-03 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-04-06 09:00:00+00', '2026-04-06 12:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-04-06 13:00:00+00', '2026-04-06 15:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-07 09:30:00+00', '2026-04-07 14:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-04-07 15:00:00+00', '2026-04-07 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-04-08 09:00:00+00', '2026-04-08 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-08 14:00:00+00', '2026-04-08 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-04-09 09:00:00+00', '2026-04-09 10:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-04-09 10:30:00+00', '2026-04-09 16:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-04-10 09:00:00+00', '2026-04-10 12:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-13 09:00:00+00', '2026-04-13 15:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-04-14 10:00:00+00', '2026-04-14 13:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-14 14:00:00+00', '2026-04-14 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-04-15 09:00:00+00', '2026-04-15 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-04-15 15:00:00+00', '2026-04-15 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-04-16 09:00:00+00', '2026-04-16 11:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-04-16 13:00:00+00', '2026-04-16 14:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-17 09:00:00+00', '2026-04-17 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-20 09:00:00+00', '2026-04-20 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-04-20 14:00:00+00', '2026-04-20 16:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-04-21 09:00:00+00', '2026-04-21 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-04-22 09:30:00+00', '2026-04-22 12:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-04-22 13:00:00+00', '2026-04-22 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-23 09:00:00+00', '2026-04-23 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-04-23 15:00:00+00', '2026-04-23 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-24 09:00:00+00', '2026-04-24 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-04-27 09:00:00+00', '2026-04-27 10:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-04-27 11:00:00+00', '2026-04-27 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-04-28 09:00:00+00', '2026-04-28 15:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-04-29 10:00:00+00', '2026-04-29 13:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-04-29 14:00:00+00', '2026-04-29 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-04-30 09:00:00+00', '2026-04-30 17:00:00+00', true),

    -- ── MAY ──────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-05-04 09:00:00+00', '2026-05-04 12:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-05-04 13:00:00+00', '2026-05-04 14:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-05-05 09:00:00+00', '2026-05-05 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-05-06 09:30:00+00', '2026-05-06 14:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-05-06 15:00:00+00', '2026-05-06 17:00:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-05-07 09:00:00+00', '2026-05-07 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-05-08 09:00:00+00', '2026-05-08 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-05-08 14:00:00+00', '2026-05-08 16:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-05-11 09:00:00+00', '2026-05-11 13:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-05-11 14:00:00+00', '2026-05-11 15:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-05-12 09:00:00+00', '2026-05-12 14:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-05-12 15:00:00+00', '2026-05-12 18:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_design,   '2026-05-13 09:30:00+00', '2026-05-13 12:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-05-13 13:00:00+00', '2026-05-13 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_research, '2026-05-14 10:00:00+00', '2026-05-14 12:30:00+00', false),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-05-14 13:00:00+00', '2026-05-14 17:30:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_review,   '2026-05-15 09:00:00+00', '2026-05-15 11:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_api,      '2026-05-15 12:00:00+00', '2026-05-15 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_frontend, '2026-05-18 09:00:00+00', '2026-05-18 15:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_meeting,  '2026-05-18 16:00:00+00', '2026-05-18 17:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_ui,       '2026-05-19 09:00:00+00', '2026-05-19 12:00:00+00', true),
    (gen_random_uuid(), v_workspace_id, v_user_id, t_backend,  '2026-05-19 13:00:00+00', '2026-05-19 16:00:00+00', true);

  RAISE NOTICE 'Seed complete. User: %, Workspace: %', v_user_id, v_workspace_id;
END $$;
