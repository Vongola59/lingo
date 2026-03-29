# Lingo

一个基于 Next.js App Router 的语言学习平台，包含学习闯关、爱心与 XP、排行榜、Stripe 订阅，以及后台内容管理。

## 功能概览

- 学习流程：课程 → 单元 → 课时 → 挑战（题目）
- 题目类型：`SELECT`、`ASSIST`
- 进度系统：挑战完成状态、课时进度、当前位置恢复
- 资源系统：答错扣心、完成加 XP、练习回心、积分兑换心力
- 订阅系统：Stripe Checkout / Billing Portal + Webhook 同步
- 管理后台：`/admin` 下课程内容 CRUD

## 技术栈

- 框架：`Next.js 16`（App Router）
- 语言：`TypeScript`
- 前端：`React 19` + `Tailwind CSS 4` + `Radix UI`
- 认证：`Clerk`
- 数据库：`PostgreSQL (Neon)` + `Drizzle ORM`
- 支付：`Stripe`
- 状态管理：`Zustand`
- 后台：`React Admin`

## 快速开始

### 1) 安装依赖

推荐使用 pnpm：

```bash
pnpm install
```

### 2) 配置环境变量

在项目根目录创建 `.env`：

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3) 初始化数据库

```bash
pnpm db:push
pnpm db:seed
```

### 4) 启动开发服务

```bash
pnpm dev
```

## 常用脚本

```bash
pnpm dev        # 启动开发环境
pnpm build      # 构建生产包
pnpm start      # 启动生产服务
pnpm lint       # 代码检查

pnpm db:push    # 推送 Drizzle schema
pnpm db:studio  # 打开 Drizzle Studio
pnpm db:seed    # 开发数据初始化
pnpm db:prod    # 生产风格种子数据（不会清空 user_subscription）
pnpm db:reset   # 清空业务数据（默认保留 user_subscription）
```

## 核心目录

```text
lingo/
├─ app/                 # 页面与 API（含 webhook、admin）
├─ actions/             # Server Actions（进度、订阅）
├─ components/          # 业务组件与 UI 组件
├─ db/                  # schema、queries、连接
├─ lib/                 # stripe/admin/utils
├─ scripts/             # seed/reset/prod 脚本
├─ store/               # Zustand 状态
└─ constants.ts         # 业务常量
```

## Stripe 订阅与 Webhook

### 本地调试流程

1. 使用 Stripe CLI 监听 webhook（例如转发到 `/api/webhooks/stripe`）。
2. 将 CLI 输出的签名密钥写入 `.env` 的 `STRIPE_WEBHOOK_SECRET`。
3. 重启开发服务后再触发测试事件。

### 事件处理说明

项目处理以下核心事件并写入 `user_subscription`：

- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

实现中已包含幂等处理（避免重复 webhook 造成冲突）。

## 核心业务规则

- 默认爱心：`5`
- 完成挑战奖励：`+10 XP`
- 练习模式可回心，且不超过上限
- 商店入口路由为 `/shop`（不是 `/store`）
- Pro 用户具备无限爱心能力

## 数据模型（核心）

- `courses`：课程
- `units`：单元
- `lessons`：课时
- `challenges`：题目
- `challenge_options`：题目选项
- `challenge_progress`：用户题目进度
- `user_progress`：用户总进度
- `user_subscription`：订阅信息

## 缓存策略

- `React cache`：请求内复用
- `unstable_cache`：跨请求缓存
- `tags`：按业务标签主动失效

## 部署检查清单

- 确认生产环境变量完整（Clerk / Database / Stripe / App URL）
- 确认 webhook 路由可公网访问并已在 Stripe 后台配置
- 部署后执行一次 `pnpm db:push`
- 使用 Stripe 测试事件验证订阅状态是否能正确落库

## FAQ

### 为什么支付成功但订阅未生效？

优先检查：

- `STRIPE_WEBHOOK_SECRET` 是否与当前 CLI/后台配置一致
- webhook 事件是否成功命中 `/api/webhooks/stripe`
- 数据库连接与 `user_subscription` 表是否可写

### 为什么用户会被扣心？

普通用户在学习模式答错会扣心；Pro 用户不受普通扣心限制。
