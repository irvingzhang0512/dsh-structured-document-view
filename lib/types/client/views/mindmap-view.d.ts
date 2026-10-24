import type { MindMapViewModel } from '../adapters/mindmap.ts';
import type { ViewState } from '../../shared/view-state.ts';
import type { StructuredDocument } from '../../shared/ir.ts';
import type { ViewCommand } from '../../shared/types.ts';
import type { CommandAckPayload, MindMapViewportController } from '../runtime.ts';
/** 思维导图视图组件。 */
export declare function MindMapView(props: {
    model: MindMapViewModel;
    document: StructuredDocument;
    state: ViewState;
    onSelectNode: (nodeId: string) => void;
    onOpenNode: (nodeId: string) => void;
    onToggleNode: (nodeId: string) => void;
    onViewStateChange: (patch: {
        zoom?: number;
        pan?: {
            x: number;
            y: number;
        };
    }) => void;
    onViewportReady: (controller: MindMapViewportController) => () => void;
    onCommand: (command: ViewCommand) => Promise<CommandAckPayload>;
}): React.ReactElement;
