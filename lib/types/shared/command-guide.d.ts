import type { ViewCommand } from './types.ts';
export type GuideLevel = 'simple' | 'combined';
export interface ViewGuideEntry {
    id: string;
    level: GuideLevel;
    phrase: string;
    description: string;
    commands: ViewCommand[];
    needsSelection?: boolean;
    needsTarget?: boolean;
    views?: Array<'markdown' | 'mindmap' | 'table'>;
}
/** UI 与 get_view_help 共用的自然语言指令目录。 */
export declare const VIEW_COMMAND_GUIDE: readonly ViewGuideEntry[];
export declare function guideEntries(level?: GuideLevel): ViewGuideEntry[];
