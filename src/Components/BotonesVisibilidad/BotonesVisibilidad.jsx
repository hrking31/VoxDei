import {
  TagIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import IconMenu from "../../Components/IconMenu/IconMenu.jsx";

export default function BotonesVisibilidad({
  toggleVisibleTicker,
  toggleVisibleTitulo,
  toggleVisibleTexto,
}) {
  return (
    <IconMenu
      options={[
        {
          // label: "Ticker",
          icon: <TagIcon className="w-7 h-7 text-app-success" />,
          onClick: toggleVisibleTicker,
        },
        {
          // label: "Título",
          icon: <DocumentTextIcon className="w-7 h-7 text-app-accent" />,
          onClick: toggleVisibleTitulo,
        },
        {
          // label: "Texto",
          icon: <ChatBubbleLeftRightIcon className="w-7 h-7 text-app-main" />,
          onClick: toggleVisibleTexto,
        },
      ]}
    />
  );
}
