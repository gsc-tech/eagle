import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ParameterForm } from "./ParameterForm";
export const WidgetContainer = ({ children, title, parameters, onParametersChange, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const hasTitleOrParams = title || (parameters && parameters.length > 0 && onParametersChange);
    return (_jsxs("div", { className: `w-full h-full border overflow-hidden flex flex-col shadow-premium transition-all duration-300 hover:shadow-premium-hover ${darkMode
            ? 'dark bg-[#1f2937] border-gray-700 text-gray-100'
            : 'bg-white border-border-light text-text-primary'}`, children: [hasTitleOrParams && (_jsx("div", { className: `${darkMode ? 'bg-[#1f2937]' : 'bg-white'}`, children: _jsxs("div", { className: `flex drag-handle items-center gap-3 px-3 py-2 ${title && parameters && parameters.length > 0 && onParametersChange ? 'flex-wrap' : ''}`, children: [title && (_jsx("h3", { className: `text-sm font-semibold whitespace-nowrap ${darkMode ? 'text-gray-100' : 'text-text-primary'}`, children: title })), parameters && parameters.length > 0 && onParametersChange && (_jsx(ParameterForm, { parameters: parameters, onParametersChange: onParametersChange, darkMode: darkMode, groupedParametersValues: groupedParametersValues, onGroupedParametersChange: onGroupedParametersChange }))] }) })), _jsx("div", { className: "flex-1 overflow-hidden relative", children: children })] }));
};
