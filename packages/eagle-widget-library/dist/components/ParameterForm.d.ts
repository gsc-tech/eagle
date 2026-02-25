import React from 'react';
import type { ParameterDefinition, ParameterValues } from '../types';
interface ParameterFormProps {
    parameters: ParameterDefinition[];
    onParametersChange: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
}
export declare const ParameterForm: React.FC<ParameterFormProps & {
    darkMode?: boolean;
}>;
export {};
