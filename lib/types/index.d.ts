import type { Context } from './context-types.ts';
/** cordis.yml 行用的插件标识。 */
export declare const name = "dsh-structured-document-view";
/** 挂载前必需的服务：工具注册中心、web 升级面、web 运行时可信主机、技能注册中心。 */
export declare const inject: string[];
/** 桥升级路径（必须与客户端半区一致）。 */
export declare const BRIDGE_PATH = "/structured-document-view/ws";
/**
 * 插件主体：挂载桥端点与视图工具。
 * @param ctx - 宿主插件上下文（tools、webServer、webRuntime、skills）。
 */
export declare function apply(ctx: Context): void;
