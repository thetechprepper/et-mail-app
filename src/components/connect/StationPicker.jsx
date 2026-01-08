import React, { useMemo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
  Item,
  Picker,
  Text,
  View
} from "@adobe/react-spectrum";

export default function StationPicker({
  label = "Select station using",
  methods,
  selectedStation,
  onSelectStation
}) {
  const [selectedMethodKey, setSelectedMethodKey] = useState(
    methods && methods.length ? methods[0].key : null
  );
  const [isOpen, setIsOpen] = useState(false);

  const selectedMethod = useMemo(() => {
    if (!methods || !methods.length) return null;
    return methods.find((m) => m.key === selectedMethodKey) || methods[0];
  }, [methods, selectedMethodKey]);

  const handleMethodChange = (key) => {
    setSelectedMethodKey(key);
    setIsOpen(true);
  };

  const handlePick = (station, close) => {
    if (onSelectStation) {
      onSelectStation(station);
    }
    close();
  };

  return (
    <View>
      <Picker
        label={label}
        selectedKey={selectedMethodKey}
        onSelectionChange={handleMethodChange}
        width="100%"
      >
        {(methods || []).map((m) => (
          <Item key={m.key}>{m.label}</Item>
        ))}
      </Picker>

      {selectedStation && (
        <View marginTop="size-200">
          <Text>
            Selected: {selectedStation.name || ""} {selectedStation.uri ? `(${selectedStation.uri})` : ""}
          </Text>
        </View>
      )}

      <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <Button isHidden aria-label="Open station picker dialog">
          Open
        </Button>

        {(close) => (
          <Dialog>
            <Heading>{selectedMethod ? selectedMethod.label : "Select station"}</Heading>
            <Divider />
            <Content>
              <View
                UNSAFE_style={{
                  width: "90vw",
                  height: "70vh",
                  overflow: "auto"
                }}
              >
                {selectedMethod && typeof selectedMethod.render === "function" ? (
                  selectedMethod.render({
                    selectedStation,
                    onPick: (station) => handlePick(station, close)
                  })
                ) : (
                  <Text>No method UI provided.</Text>
                )}
              </View>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>
                Cancel
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogTrigger>
    </View>
  );
}
