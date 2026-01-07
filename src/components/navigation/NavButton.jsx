import React from "react";
import { ActionButton, Text, View } from "@adobe/react-spectrum";

export default function NavButton({
  icon,
  label,
  view,
  activeView,
  setActiveView
}) {
  return (
    <ActionButton
      isQuiet
      isSelected={activeView === view}
      onPress={() => setActiveView(view)}
      aria-label={label}
    >
      {icon}
      <Text>{label}</Text>
    </ActionButton>
  );
}
