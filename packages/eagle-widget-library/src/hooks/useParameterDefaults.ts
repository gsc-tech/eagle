import { useMemo } from 'react';
import type { ParameterDefinition, ParameterValues } from '../types';

export const useParameterDefaults = (parameters?: ParameterDefinition[]): ParameterValues => {
    return useMemo(() => {
        const defaults: ParameterValues = {};
        if (parameters) {
            parameters.forEach(param => {
                defaults[param.name] = param.defaultValue ?? '';
            });
        }
        return defaults;
    }, [parameters]);
};
