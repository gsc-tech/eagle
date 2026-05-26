import { MeasureRegistryModal } from "@gsc-tech/eagle-widget-library";

interface Props {
    onClose: () => void;
}

export default function MeasureRegistryDrawer({ onClose }: Props) {
    return <MeasureRegistryModal isOpen={true} onClose={onClose} />;
}
