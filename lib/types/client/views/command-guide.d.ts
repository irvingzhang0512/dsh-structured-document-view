import type { StructuredDocument } from '../../shared/ir.ts';
import type { ViewState } from '../../shared/view-state.ts';
import type { ViewRuntime } from '../runtime.ts';
export declare function CommandGuide({ runtime, state, document }: {
    runtime: ViewRuntime;
    state: ViewState;
    document: StructuredDocument | null;
}): React.ReactElement;
