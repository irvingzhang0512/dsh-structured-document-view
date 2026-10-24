import type { DocNode, StructuredDocument } from '../../shared/ir.ts';
import type { ViewState } from '../../shared/view-state.ts';
import type { ViewRuntime } from '../runtime.ts';
interface PathEntry {
    id: string;
    title: string;
}
export declare function findPath(root: DocNode, id: string): DocNode[] | null;
export declare function searchNodes(document: StructuredDocument, query: string): Array<{
    node: DocNode;
    path: PathEntry[];
}>;
export declare function MarkdownView({ runtime, state }: {
    runtime: ViewRuntime;
    state: ViewState;
}): React.ReactElement;
export {};
