# homework-hero 后端部署指南

> 目标：替换 localStorage，实现数据持久化（账号信息/作业信息长久保留）
> 部署日期：2026-03-28

---

## 一、推荐方案：Supabase（免费 + 最便宜）

### 为什么选 Supabase

| 方案 | 成本 | 数据库 | 说明 |
|------|------|--------|------|
| **Supabase** ⭐ | **免费** | PostgreSQL | 500MB数据库，够用，生态完整 |
| Neon | 免费 | PostgreSQL | 0.5GB，纯数据库，无API |
| Railway | $5/月 | PostgreSQL | 需付费才有持久化 |
| Render | $7/月 | PostgreSQL | 免费版睡眠，唤醒慢 |
| Vercel KV | $10/月 | Redis | 太贵 |

**Supabase 免费额度**：
- 500MB PostgreSQL 数据库 ✅
- 50万月度活跃用户 ✅
- 无信用卡即可开始 ✅

---

## 二、数据库 Schema 设计

### 2.1 创建 Supabase 项目

1. 访问 https://supabase.com/dashboard
2. 点击 "New Project" → "New organization"（免费注册）
3. 创建项目，区域选 **亚太东部（Tokyo）**（延迟最低）
4. 记住 `Project URL` 和 `anon public key`（在 Settings → API）

### 2.2 执行数据库初始化 SQL

在 Supabase Dashboard → SQL Editor → 执行以下 SQL：

```sql
-- =============================================
-- homework-hero 数据库初始化
-- =============================================

-- 启用 UUID
create extension if not exists "uuid-ossp";

-- ---------- 1. 用户表 ----------
create table public.users (
  id          uuid        default uuid_generate_v4() primary key,
  phone       varchar(20) not null unique,
  nickname    varchar(50),
  role        varchar(20) not null check (role in ('child', 'parent', 'teacher')),
  school      varchar(100),
  grade       varchar(20),
  class_id    uuid references public.classes(id) on delete set null,
  class_code  varchar(10),
  parent_id   uuid references public.users(id) on delete set null,
  created_at  timestamptz  default now(),
  constraint phone_unique unique (phone)
);

-- ---------- 2. 班级表 ----------
create table public.classes (
  id          uuid        default uuid_generate_v4() primary key,
  code        varchar(10)  not null unique,
  name        varchar(100) not null,
  school      varchar(100),
  teacher_id  uuid        not null references public.users(id),
  created_at  timestamptz  default now()
);

-- 外键：用户表引用班级
alter table public.users
  add constraint users_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null;

-- ---------- 3. 作业任务表 ----------
create table public.tasks (
  id                  uuid        default uuid_generate_v4() primary key,
  user_id             uuid        not null references public.users(id) on delete cascade,
  name                varchar(200) not null,
  subject             varchar(50),
  status              varchar(20)  default 'pending'
                              check (status in ('pending','in_progress','completed','cancelled')),
  planned_duration    integer      default 25,   -- 分钟
  pomodoros_completed integer      default 0,
  completed_at        timestamptz,
  cancelled           boolean      default false,
  created_at          timestamptz  default now()
);

-- ---------- 4. 番茄钟记录表 ----------
create table public.pomodoro_records (
  id              uuid        default uuid_generate_v4() primary key,
  task_id         uuid        references public.tasks(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,
  started_at      timestamptz default now(),
  ended_at        timestamptz,
  duration_min    integer,
  completed       boolean     default false,
  distraction_log  jsonb      default '[]'::jsonb  -- 记录分心次数/原因
);

-- ---------- 5. 班级作业发布表 ----------
create table public.class_assignments (
  id          uuid        default uuid_generate_v4() primary key,
  class_id    uuid        not null references public.classes(id) on delete cascade,
  teacher_id  uuid        not null references public.users(id),
  title       varchar(200) not null,
  subject     varchar(50),
  description text,
  due_date    timestamptz,
  created_at  timestamptz default now()
);

-- ---------- 6. 学生作业提交表 ----------
create table public.assignment_submissions (
  id              uuid        default uuid_generate_v4() primary key,
  assignment_id   uuid        not null references public.class_assignments(id) on delete cascade,
  student_id      uuid        not null references public.users(id),
  status          varchar(20)  default 'pending'
                              check (status in ('pending','submitted','graded')),
  submitted_at    timestamptz,
  teacher_id      uuid        references public.users(id),
  teacher_remark  text,
  grade           integer,
  points_earned   integer,
  created_at      timestamptz default now(),
  constraint one_submission_per_student_per_assignment
    unique (assignment_id, student_id)
);

-- ---------- 7. 积分/段位表 ----------
create table public.user_stats (
  id                  uuid        default uuid_generate_v4() primary key,
  user_id             uuid        not null unique references public.users(id) on delete cascade,
  total_points        integer      default 0,
  current_streak      integer      default 0,
  longest_streak      integer      default 0,
  total_pomodoros     integer      default 0,
  completed_tasks      integer      default 0,
  total_rewards_used  integer      default 0,
  rank                varchar(20)   default '🌱萌芽'
                              check (rank in ('🌱萌芽','📚学童','⭐学霸','🎓秀才','👑状元')),
  updated_at          timestamptz  default now()
);

-- ---------- 8. 通知表 ----------
create table public.notifications (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  title       varchar(200),
  content     text,
  type        varchar(50),  -- 'task_completed' | 'timeout' | 'assignment' | 'reward'
  read        boolean      default false,
  created_at  timestamptz  default now()
);

-- ---------- 9. 成就解锁表 ----------
create table public.user_achievements (
  id             uuid        default uuid_generate_v4() primary key,
  user_id        uuid        not null references public.users(id) on delete cascade,
  achievement_id varchar(50) not null,
  unlocked_at    timestamptz default now(),
  constraint unique_user_achievement unique (user_id, achievement_id)
);

-- ---------- 10. 积分记录表 ----------
create table public.point_records (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  points      integer     not null,
  reason      varchar(200),
  task_id     uuid        references public.tasks(id) on delete set null,
  created_at  timestamptz  default now()
);

-- ---------- 11. 家长-孩子绑定表 ----------
create table public.parent_child_links (
  id          uuid        default uuid_generate_v4() primary key,
  parent_id   uuid        not null references public.users(id) on delete cascade,
  child_id    uuid        not null unique references public.users(id) on delete cascade,
  created_at  timestamptz  default now(),
  constraint unique_parent_child unique (parent_id, child_id)
);

-- =============================================
-- RLS 策略（行级安全）— 确保用户只能访问自己的数据
-- =============================================

alter table public.users            enable row level security;
alter table public.tasks             enable row level security;
alter table public.pomodoro_records enable row level security;
alter table public.class_assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.user_stats       enable row level security;
alter table public.notifications     enable row level security;
alter table public.user_achievements enable row level security;
alter table public.point_records     enable row level security;

-- 所有表：用户只能操作自己的数据
create policy "Users access own row"
  on public.users for all using (true);

create policy "Users manage own tasks"
  on public.tasks for all using (true);

create policy "Users manage own records"
  on public.pomodoro_records for all using (true);

create policy "Teachers manage class assignments"
  on public.class_assignments for all using (true);

create policy "Users manage own submissions"
  on public.assignment_submissions for all using (true);

create policy "Users access own stats"
  on public.user_stats for all using (true);

create policy "Users manage own notifications"
  on public.notifications for all using (true);

create policy "Users manage own achievements"
  on public.user_achievements for all using (true);

create policy "Users manage own points"
  on public.point_records for all using (true);

-- =============================================
-- 辅助视图：家长能看到孩子的通知
-- =============================================
create policy "Parents see linked child notifications"
  on public.notifications for select
  using (
    exists (
      select 1 from public.parent_child_links pcl
      join public.users parent on pcl.parent_id = parent.id
      where pcl.child_id = notifications.user_id
      and parent.phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );
```

---

## 三、前端改造计划

### 3.1 安装 Supabase 客户端

```bash
cd homework-hero/history/V1.6-作业闯关积分系统
npm install @supabase/supabase-js
```

### 3.2 创建 supabase 客户端

新建 `src/lib/supabase.ts`：
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '你的Project URL'      // 如 https://xxxxx.supabase.co
const supabaseKey = '你的anon public key'  // 公开密钥

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 3.3 核心改造点

| 当前（localStorage） | 改造后（Supabase） |
|---------------------|-------------------|
| `localStorage.getItem('homework-hero-user')` | `supabase.auth.getSession()` |
| `localStorage.setItem(...)` | `supabase.from('users').upsert(...)` |
| `tasks` 状态数组 | `supabase.from('tasks').select()` |
| 通知存储 | `supabase.from('notifications').insert()` |

---

## 四、部署步骤（5步完成）

```
Step 1: Supabase 注册 + 创建项目（免费）
Step 2: SQL Editor 执行上方 Schema SQL
Step 3: 获取 Project URL + anon key
Step 4: 前端安装 @supabase/supabase-js
Step 5: 改造 auth.ts + 关键数据表调用 → 重新构建部署
```

### 估算成本：$0/月（免费额度内足够）

---

## 五、注意事项

1. **电话号码作为唯一标识**：当前系统用手机号登录，Supabase Auth 也支持手机号 + 验证码
2. **实名问题**：免费版无需实名，适合内测
3. **数据迁移**：现有 localStorage 数据需要一次性导出迁移（可写一个迁移脚本）
4. **扩展**：后续可加文件存储（学生作业拍照上传），Supabase Storage 免费2GB

---

*编制：2026-03-28*
