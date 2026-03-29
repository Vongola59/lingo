import { neon } from "@neondatabase/serverless";
import { drizzle } from 'drizzle-orm/neon-http';
//导入项目中所有自定义的数据库表结构（Schema），包含表定义、字段、关联等
import * as schema from "./schema";
//创建一个数据库连接实例，使用Neon提供的连接方式，并传入数据库URL（从环境变量中获取）。
// 校验DATABASE_URL环境变量是否存在
if (!process.env.DATABASE_URL) {
  throw new Error("环境变量DATABASE_URL未配置,请在.env文件中添加该变量");
}
const sql = neon(process.env.DATABASE_URL); 
//创建一个Drizzle数据库实例，传入Neon连接和定义好的Schema
const db = drizzle(sql, { schema });

export default db;

//为什么选择@neondatabase/serverless的 HTTP 客户端，而不是传统的 PostgreSQL TCP 客户端（如 pg）？
//核心原因是适配 Next.js 的服务端执行环境（Server Actions/Edge Functions）
//Next.js Server Actions/Edge Functions 运行在 Vercel 等无服务平台，这类环境默认禁止 TCP 长连接，而传统 pg 客户端基于 TCP 连接，会出现连接失败、超时等问题；Neon 的 HTTP 客户端基于 HTTP/HTTPS 协议，完全适配无服务环境的网络规则；