import { useMemo } from 'react';
export const useParameterDefaults = (parameters) => {
    return useMemo(() => {
        const defaults = {};
        if (parameters) {
            parameters.forEach(param => {
                defaults[param.name] = param.defaultValue ?? '';
            });
        }
        return defaults;
    }, [parameters]);
};
