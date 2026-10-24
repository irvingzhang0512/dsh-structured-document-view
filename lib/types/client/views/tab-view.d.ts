import type { TabComponentProps } from 'dsh-better-sidebar';
import type { ViewSessionManager } from '../session-manager.ts';
/** TabView 组件。 */
export interface StructuredDocumentTabProps extends TabComponentProps {
    manager: ViewSessionManager;
}
export declare function TabView(props: StructuredDocumentTabProps): React.ReactElement;
