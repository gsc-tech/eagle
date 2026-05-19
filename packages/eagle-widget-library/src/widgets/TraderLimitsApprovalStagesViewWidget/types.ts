import type { BaseWidgetProps } from "../../types";

export interface TraderLimitsApprovalStagesViewWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    title?: string;
    updateApiUrl?: string;
    approversApiUrl?: string;
    usersApiUrl?: string;
}

export interface Approver {
    id: string;
    name: string;
    email?: string;
    role?: string;
    level?: number;
    initials: string;
    avatarColor: string;
}

export interface TraderApprovalStage {
    id: string;
    trader: Approver;
    stages: Approver[];
}